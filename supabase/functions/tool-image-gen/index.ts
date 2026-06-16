// Sprint 2.4-a — Tool: image_gen (OpenRouter, Nano Banana)
// Master §5.3: toda IA generativa passa pelo OpenRouter.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default: Nano Banana (cheap, high-quality). Fallback: Nano Banana 2 Pro.
const IMAGE_MODELS = [
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: aceita JWT de usuário válido OU service role key (runtime do agente).
  // Antes era totalmente aberto — qualquer um podia esgotar quota OpenRouter.
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
    const { prompt, aspect_ratio = "1:1" } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt é obrigatório", code: "INVALID_INPUT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Tool indisponível: OPENROUTER_API_KEY não configurada", code: "MISSING_SECRET" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // OpenRouter image-output via chat/completions with modalities=["image","text"].
    // Aspect ratio is appended to the prompt — Nano Banana respects natural-language sizing hints.
    const finalPrompt = aspect_ratio && aspect_ratio !== "1:1"
      ? `${prompt}\n\nAspect ratio: ${aspect_ratio}.`
      : prompt;

    let lastError = "";
    for (const model of IMAGE_MODELS) {
      try {
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(60000),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aikortex26.lovable.app",
            "X-Title": "Aikortex",
          },
          body: JSON.stringify({
            model,
            modalities: ["image", "text"],
            messages: [{ role: "user", content: finalPrompt }],
          }),
        });

        if (!resp.ok) {
          lastError = `${model} → HTTP ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 200)}`;
          continue;
        }

        const data = await resp.json();
        const msg = data?.choices?.[0]?.message;
        // OpenRouter returns generated images in `message.images[].image_url.url` (data URL or https).
        const images = msg?.images || [];
        const first = images[0]?.image_url?.url || images[0]?.url || null;

        if (!first) {
          lastError = `${model} → resposta sem imagem`;
          continue;
        }

        return new Response(
          JSON.stringify({ prompt, aspect_ratio, model, image_url: first }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (e) {
        lastError = `${model} → ${(e as Error).message}`;
        continue;
      }
    }

    return new Response(
      JSON.stringify({ error: "Falha em todos os modelos de imagem", detail: lastError, code: "UPSTREAM_ERROR" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
