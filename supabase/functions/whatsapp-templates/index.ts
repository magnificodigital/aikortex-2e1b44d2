// Lista/cria/deleta templates do WhatsApp via Meta Cloud API.
// Lê tokens BYOK do user_api_keys (mesma estratégia de whatsapp-send).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isMetaTokenExpired(data: any): boolean {
  return data?.error?.code === 190 && data?.error?.error_subcode === 463;
}

function metaTokenExpiredBody(data: unknown) {
  return {
    templates: [],
    integration_error: {
      code: "META_TOKEN_EXPIRED",
      message: "Token do WhatsApp expirado. Atualize o System User Access Token em Integrações → WhatsApp.",
      details: data,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonRes({ error: "Authorization header required" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonRes({ error: "Unauthorized" }, 401);

    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", user.id)
      .in("provider", ["whatsapp_access_token", "whatsapp_business_account_id"]);

    const keyMap: Record<string, string> = {};
    (keys ?? []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });
    const WABA_TOKEN = keyMap.whatsapp_access_token;
    const WABA_ID = keyMap.whatsapp_business_account_id;

    if (!WABA_TOKEN || !WABA_ID) {
      return jsonRes({
        error: "MISSING_WABA_CONFIG: configure access_token e business_account_id em Integrações → WhatsApp"
      }, 400);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    switch (action) {
      case "list": {
        // Campos relevantes: name, status, language, category, components (pra detectar variáveis)
        const fields = "name,status,language,category,components,quality_score,rejected_reason";
        const limit = url.searchParams.get("limit") || "100";
        const resp = await fetch(
          `${GRAPH_API}/${WABA_ID}/message_templates?fields=${fields}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${WABA_TOKEN}` } },
        );
        const data = await resp.json();
        if (!resp.ok && isMetaTokenExpired(data)) return jsonRes(metaTokenExpiredBody(data));
        if (!resp.ok) return jsonRes({ error: "Erro ao listar templates", details: data }, resp.status);
        return jsonRes({ templates: data.data || [], paging: data.paging });
      }

      case "create": {
        const body = await req.json().catch(() => ({}));
        const { name, category = "UTILITY", language = "pt_BR", components } = body;
        if (!name || !components) return jsonRes({ error: "name e components são obrigatórios" }, 400);

        const resp = await fetch(`${GRAPH_API}/${WABA_ID}/message_templates`, {
          method: "POST",
          headers: { Authorization: `Bearer ${WABA_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name, category, language, components }),
        });
        const data = await resp.json();
        if (!resp.ok && isMetaTokenExpired(data)) return jsonRes(metaTokenExpiredBody(data), 401);
        if (!resp.ok) return jsonRes({ error: "Erro ao criar template", details: data }, resp.status);
        return jsonRes({ success: true, template: data });
      }

      case "delete": {
        const body = await req.json().catch(() => ({}));
        const { name } = body;
        if (!name) return jsonRes({ error: "name é obrigatório" }, 400);
        const resp = await fetch(`${GRAPH_API}/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${WABA_TOKEN}` },
        });
        const data = await resp.json();
        if (!resp.ok && isMetaTokenExpired(data)) return jsonRes(metaTokenExpiredBody(data), 401);
        return jsonRes({ success: resp.ok, data }, resp.ok ? 200 : resp.status);
      }

      default:
        return jsonRes({ error: `Ação '${action}' não suportada` }, 400);
    }
  } catch (e) {
    console.error("Templates error:", e);
    return jsonRes({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
