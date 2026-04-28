import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceId, stability, speed } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "text é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ElevenLabs key: user > platform_config > env
    let apiKey = "";

    const { data: userKey } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "elevenlabs")
      .maybeSingle();

    if (userKey?.api_key) {
      apiKey = userKey.api_key;
    } else {
      const { data: platformKey } = await supabase
        .from("platform_config")
        .select("value")
        .eq("key", "elevenlabs_api_key")
        .maybeSingle();

      if (platformKey?.value) {
        apiKey = platformKey.value;
      } else {
        apiKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Nenhuma chave ElevenLabs configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const voice = voiceId || "EXAVITQu4vr4xnSDxMaL";
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: 0.75,
            speed: speed ?? 1.0,
          },
        }),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("ElevenLabs TTS error:", resp.status, errText);
      return new Response(
        JSON.stringify({ error: `Erro TTS: ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const audioBuffer = await resp.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    console.error("browser-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
