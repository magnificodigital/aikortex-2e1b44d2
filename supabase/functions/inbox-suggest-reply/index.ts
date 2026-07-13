// inbox-suggest-reply
// ===================
// "AI Assist" do inbox: rascunha a proxima resposta do atendente humano
// com a MESMA persona do agente WhatsApp da agencia. O humano edita e
// envia — nada sai automatico daqui.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM } from "../_shared/llm-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { conversation_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.conversation_id) return json({ error: "conversation_id obrigatório" }, 400);

  // Ownership: conversa precisa ser da agencia do user
  const { data: agency } = await supabase
    .from("agency_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!agency) return json({ error: "Sem agência" }, 404);

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, agency_id, contact_name")
    .eq("id", body.conversation_id)
    .eq("agency_id", agency.id)
    .maybeSingle();
  if (!conv) return json({ error: "Conversa não encontrada" }, 404);

  // Historico recente (notas internas ficam FORA do contexto enviado)
  const { data: msgs } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conv.id)
    .neq("role", "note")
    .order("created_at", { ascending: false })
    .limit(15);
  const history = (msgs ?? []).reverse().map((m: any) => ({
    role: m.role === "consumer" ? "user" : "assistant",
    content: m.content as string,
  }));
  if (history.length === 0) return json({ error: "Conversa vazia" }, 400);

  // Persona do agente WhatsApp da agencia (mesma do auto-reply)
  let personaBits = "";
  const { data: agentKey } = await supabase
    .from("user_api_keys").select("api_key")
    .eq("provider", "whatsapp_agent_id").eq("user_id", user.id).maybeSingle();
  if (agentKey?.api_key) {
    const { data: agent } = await supabase
      .from("user_agents").select("name, description, config")
      .eq("id", agentKey.api_key).maybeSingle();
    if (agent) {
      const cfg = (agent.config as any) ?? {};
      const ctx = cfg.businessContext ?? {};
      personaBits = `Persona do atendimento: ${agent.name}${ctx.companyName ? ` da ${ctx.companyName}` : ""}. Tom: ${ctx.toneOfVoice || "profissional e amigável"}.`;
    }
  }

  const system = `Você rascunha a PRÓXIMA resposta de um atendente humano no WhatsApp.
${personaBits}
Regras: responda em português do Brasil, curto (1-3 frases), natural pra WhatsApp.
Retorne SOMENTE o texto da resposta — sem aspas, sem prefixo, sem explicação.`;

  const result = await callLLM(
    [{ role: "system", content: system }, ...history],
    { tier: "free", maxTokens: 300, timeoutMs: 15000 },
    supabase,
  );

  if (!result.success || !result.content) {
    return json({ error: "Não consegui gerar sugestão agora" }, 502);
  }
  return json({ suggestion: result.content.trim() });
});
