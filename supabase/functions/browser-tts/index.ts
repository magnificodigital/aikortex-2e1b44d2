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

    const SARAH = "EXAVITQu4vr4xnSDxMaL"; // voz stock disponivel em qualquer conta
    const requestedVoice = voiceId || SARAH;
    console.log(`[browser-tts] voice=${requestedVoice} key=${apiKey.slice(-4)}`);

    const callTts = (voice: string) => fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
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

    let resp = await callTts(requestedVoice);
    // Se 401 com voz custom, testa se a chave funciona com Sarah (stock).
    // Se Sarah funciona, o problema NAO eh a chave — eh a voz selecionada
    // que nao existe ou nao tem acesso permitido. Falha em ambos = chave/scope.
    if (resp.status === 401 && requestedVoice !== SARAH) {
      console.log(`[browser-tts] 401 com ${requestedVoice}, tentando Sarah pra disambiguar`);
      const sarahResp = await callTts(SARAH);
      if (sarahResp.ok) {
        // Chave OK, voz que estava salva eh o problema. Usa Sarah pra nao quebrar
        // a ligacao agora e avisa o user em proximo header.
        console.warn(`[browser-tts] voz ${requestedVoice} sem acesso; usando Sarah como fallback`);
        const audioBuffer = await sarahResp.arrayBuffer();
        return new Response(audioBuffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "X-Voice-Fallback": "true",
            "X-Voice-Requested": requestedVoice,
          },
        });
      }
      // Sarah tambem falhou — entao eh chave/scope. Reusa o erro original.
      resp = sarahResp;
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("ElevenLabs TTS error:", resp.status, errText);
      // Extrai mensagem util do payload do ElevenLabs ({ detail: { message }} ou
      // { detail: "..." }) pra que o toast no front seja acionavel.
      let elevenMsg = "";
      try {
        const j = JSON.parse(errText);
        elevenMsg = typeof j?.detail === "string"
          ? j.detail
          : j?.detail?.message || j?.detail?.status || j?.message || "";
      } catch { elevenMsg = errText.slice(0, 200); }

      if (resp.status === 401) {
        return new Response(
          JSON.stringify({
            error: "elevenlabs_unauthorized",
            code: "unauthorized",
            message:
              "Chave ElevenLabs inválida ou sem permissão de Text to Speech. " +
              "Acesse elevenlabs.io → API Keys, edite sua chave e habilite a permissão 'Text to Speech'. " +
              "Depois re-salve em Configurações → Integrações → Voz.",
            details: elevenMsg,
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "elevenlabs_paid_plan_required",
            code: "paid_plan_required",
            message:
              "Sua chave ElevenLabs é do plano gratuito e não permite usar esta voz via API. Faça upgrade da conta ElevenLabs (Starter+) ou selecione uma voz própria (clonada) na sua conta.",
            details: elevenMsg,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          error: `tts_error`,
          message: `ElevenLabs rejeitou o TTS (${resp.status}): ${elevenMsg || "sem detalhes"}`,
          status: resp.status,
          details: elevenMsg,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
