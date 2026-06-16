// Sprint 2.4-a — Tool: web_search (Brave Search API)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: aceita JWT de usuário válido OU service role key (runtime do agente).
  // Antes era totalmente aberto — qualquer um podia esgotar a cota Brave Search.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "MISSING_AUTH" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token !== serviceKey) {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { query, count = 5 } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "query é obrigatório", code: "INVALID_INPUT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("BRAVE_SEARCH_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Tool indisponível: chave Brave Search não configurada", code: "MISSING_SECRET" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(Math.min(Math.max(Number(count) || 5, 1), 10)));

    const resp = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Brave Search erro ${resp.status}`, detail: text.slice(0, 200), code: "UPSTREAM_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const results = (data?.web?.results || []).slice(0, 10).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));

    return new Response(JSON.stringify({ query, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
