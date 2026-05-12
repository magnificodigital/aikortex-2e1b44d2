// Sprint 2.4-a — Tool: image_gen (Replicate Flux 1.1 Pro)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_MODEL = "black-forest-labs/flux-1.1-pro";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, aspect_ratio = "1:1" } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt é obrigatório", code: "INVALID_INPUT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("REPLICATE_API_TOKEN");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Tool indisponível: token Replicate não configurado", code: "MISSING_SECRET" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create prediction (sync mode via Prefer: wait, max ~60s)
    const resp = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      signal: AbortSignal.timeout(75000),
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio,
          output_format: "webp",
          output_quality: 90,
          safety_tolerance: 2,
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Replicate erro ${resp.status}`, detail: text.slice(0, 300), code: "UPSTREAM_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    if (data?.status === "failed") {
      return new Response(
        JSON.stringify({ error: data?.error || "Falha ao gerar imagem", code: "GENERATION_FAILED" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const output = data?.output;
    const imageUrl = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : null);

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Geração ainda em andamento — tente novamente", code: "TIMEOUT", prediction_id: data?.id }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ prompt, aspect_ratio, image_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
