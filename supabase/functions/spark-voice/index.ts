// Spark voice loop: ElevenLabs STT -> Aikortex LLM (OpenRouter via llm-fallback) -> ElevenLabs TTS.
// Returns transcript, assistant reply text, and TTS audio (base64 mp3).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callLLM } from "../_shared/llm-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Multilingual default voice (Sarah). User can override via user_api_keys.provider='elevenlabs_voice_id'.
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = "eleven_flash_v2_5";
const STT_MODEL = "scribe_v1";

const SYSTEM_PROMPT = `Você é o Spark, o copiloto por voz do Aikortex — funciona como o Jarvis do Tony Stark para a pessoa que está falando.
Estilo: respostas curtas, naturais, em português do Brasil, soando como uma conversa real (não como texto formal).
Evite listas numeradas, markdown, emojis ou frases longas. Use no máximo 2 a 3 frases por resposta, a não ser que peçam detalhes.
Quando o usuário pedir para criar um agente, app, dashboard ou automação, confirme em uma frase o que entendeu e diga que vai abrir o construtor.
Nunca diga que é uma IA da OpenAI ou Google — você é o Spark do Aikortex.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: keys } = await admin
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", userId)
      .in("provider", ["elevenlabs", "elevenlabs_voice_id"]);

    const map = new Map<string, string>();
    (keys ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));
    const elevenKey = map.get("elevenlabs") ?? "";
    const voiceId = (map.get("elevenlabs_voice_id") || "").trim() || DEFAULT_VOICE_ID;

    if (!elevenKey) {
      return json({
        error: "elevenlabs_not_configured",
        message: "Configure sua chave ElevenLabs em Configurações → Integrações → Voz.",
      }, 400);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return json({ error: "llm_not_configured", message: "Lovable AI Gateway não está configurado." }, 500);
    }

    const contentType = req.headers.get("content-type") ?? "";
    let userText = "";
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audio = form.get("audio");
      const historyRaw = form.get("history");
      if (historyRaw && typeof historyRaw === "string") {
        try { history = JSON.parse(historyRaw); } catch { /* ignore */ }
      }
      if (audio && audio instanceof File) {
        // ElevenLabs STT
        const sttForm = new FormData();
        sttForm.append("file", audio, audio.name || "audio.webm");
        sttForm.append("model_id", STT_MODEL);
        const sttResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": elevenKey },
          body: sttForm,
        });
        if (!sttResp.ok) {
          const t = await sttResp.text();
          return json({ error: "stt_failed", status: sttResp.status, details: t }, 400);
        }
        const sttJson = await sttResp.json();
        userText = (sttJson?.text ?? "").trim();
      } else {
        const text = form.get("text");
        if (typeof text === "string") userText = text.trim();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      userText = String(body?.text ?? "").trim();
      if (Array.isArray(body?.history)) history = body.history;
    }

    if (!userText) {
      return json({ error: "empty_input", message: "Não entendi o áudio. Tente novamente." }, 400);
    }

    // LLM via Lovable AI Gateway (OpenAI-compatible)
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user", content: userText },
    ];
    const llmResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0.7 }),
    });
    if (!llmResp.ok) {
      const t = await llmResp.text();
      return json({ error: "llm_failed", status: llmResp.status, details: t }, 502);
    }
    const llmJson = await llmResp.json();
    const reply: string = (llmJson?.choices?.[0]?.message?.content ?? "").trim();
    if (!reply) return json({ error: "empty_reply" }, 502);

    // ElevenLabs TTS
    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: reply,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
        }),
      },
    );
    if (!ttsResp.ok) {
      const t = await ttsResp.text();
      return json({ error: "tts_failed", status: ttsResp.status, details: t }, 502);
    }
    const audioBuf = new Uint8Array(await ttsResp.arrayBuffer());
    const audioB64 = base64Encode(audioBuf);

    return json({
      transcript: userText,
      reply,
      audio: audioB64,
      audio_mime: "audio/mpeg",
    });
  } catch (e) {
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(binary);
}
