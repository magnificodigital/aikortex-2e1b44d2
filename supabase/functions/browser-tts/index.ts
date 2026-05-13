import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthContext, handleCors, corsHeaders } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const authResult = await getAuthContext(req);
  if (authResult instanceof Response) return authResult;

  const { user, supabase: client } = authResult;

  try {
    const { text, voiceId, stability, speed } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "text é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ElevenLabs key: user > platform_config > env
    let apiKey = "";

    const { data: userKey } = await client
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "elevenlabs")
      .maybeSingle();

    if (userKey?.api_key) {
      apiKey = userKey.api_key;
    } else {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: platformKey } = await adminClient
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
