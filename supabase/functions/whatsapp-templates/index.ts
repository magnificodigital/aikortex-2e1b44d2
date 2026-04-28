import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WABA_ID = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");

    if (!WHATSAPP_TOKEN || !WABA_ID) {
      return new Response(JSON.stringify({ error: "Credenciais WhatsApp não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    switch (action) {
      // ── List templates ──
      case "list": {
        const limit = url.searchParams.get("limit") || "20";
        const response = await fetch(
          `${GRAPH_API}/${WABA_ID}/message_templates?limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
          }
        );
        const data = await response.json();

        if (!response.ok) {
          return new Response(JSON.stringify({ error: "Erro ao listar templates", details: data }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          templates: data.data || [],
          paging: data.paging,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Create template ──
      case "create": {
        const body = await req.json();
        const { name, category = "UTILITY", language = "pt_BR", components } = body;

        if (!name || !components) {
          return new Response(JSON.stringify({ error: "name e components são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response = await fetch(`${GRAPH_API}/${WABA_ID}/message_templates`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            category,
            language,
            components,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return new Response(JSON.stringify({ error: "Erro ao criar template", details: data }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, template: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Delete template ──
      case "delete": {
        const body = await req.json();
        const { name } = body;

        if (!name) {
          return new Response(JSON.stringify({ error: "name é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response = await fetch(
          `${GRAPH_API}/${WABA_ID}/message_templates?name=${name}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
          }
        );

        const data = await response.json();

        return new Response(JSON.stringify({ success: response.ok, data }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Ação '${action}' não suportada` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("Templates error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erro desconhecido",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
