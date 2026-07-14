// facebook-send
// ==============
// Envio manual de DM do inbox (atendente humano). Espelha whatsapp-send:
// credenciais da agencia em user_api_keys, grava na camada canonica.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordInboxMessage } from "../_shared/inbox.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", user.id)
      .eq("provider", "facebook_page_token")
      .limit(1);
    const accessToken = keys?.[0]?.api_key;
    if (!accessToken) {
      return json({ error: "Conecte o Facebook em Configurações → Canais" }, 400);
    }

    const body = await req.json();
    const { to, message } = body;
    if (!to || !message) return json({ error: "'to' e 'message' são obrigatórios" }, 400);

    const resp = await fetch(`${GRAPH_API}/me/messages?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: to }, message: { text: message } }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("[ig-send] error:", JSON.stringify(data));
      return json({ error: "Falha ao enviar DM", details: data.error?.message }, resp.status);
    }

    await recordInboxMessage({
      supabase,
      ownerUserId: user.id,
      channel: "facebook",
      direction: "outbound",
      contactPhone: to,
      content: message,
      externalId: data.message_id ?? null,
      createCrmLead: false,
    });

    return json({ success: true, message_id: data.message_id });
  } catch (e) {
    console.error("[ig-send] error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
