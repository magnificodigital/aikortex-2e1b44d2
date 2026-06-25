// Edge function: retorna token WebRTC para o agente ElevenLabs fixo do usuário.
// NÃO cria agente por sessão — reusa o agente_id salvo em user_api_keys
// (provider = elevenlabs_agent_id), evitando poluir o dashboard ElevenLabs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message, "Header present:", !!authHeader);
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Busca chave API + agente fixo do usuário
    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", user.id)
      .in("provider", ["elevenlabs", "elevenlabs_agent_id"]);

    const map = new Map<string, string>();
    (keys ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));

    const apiKey = map.get("elevenlabs") ?? "";
    const agentId = map.get("elevenlabs_agent_id") ?? "";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave de API da ElevenLabs não configurada. Vá em Integrações para adicionar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "Agent ID da ElevenLabs não configurado. Vá em Configurações → Voz e informe o ID do agente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reusa o agente fixo: gera token de conversa WebRTC
    const tokenResp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.error("ElevenLabs token error:", tokenResp.status, errText);
      let userMessage = `Erro ao obter token de conversa: ${tokenResp.status}`;
      if (errText.includes("missing_permissions") || errText.includes("convai")) {
        userMessage = "Sua chave de API da ElevenLabs não tem permissão para Conversational AI. Acesse elevenlabs.io → API Keys → edite sua chave e habilite a permissão 'Conversational AI'.";
      }
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token: conversationToken } = await tokenResp.json();

    return new Response(
      JSON.stringify({ agentId, token: conversationToken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("elevenlabs-voice-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});