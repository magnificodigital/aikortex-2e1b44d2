// Spark voice loop: ElevenLabs STT -> Aikortex LLM (OpenRouter via llm-fallback) -> ElevenLabs TTS.
// Returns transcript, assistant reply text, and TTS audio (base64 mp3).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callLLM } from "../_shared/llm-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // CRITICO: sem Expose-Headers o browser ESCONDE qualquer header custom em
  // respostas cross-origin. Front leria null nos X-Spark-* e nao navegava.
  "Access-Control-Expose-Headers": "x-spark-intent, x-spark-transcript, x-spark-reply, x-spark-total-ms, x-voice-fallback, x-voice-fallback-reason",
};

// Multilingual default voice (Sarah). User can override via user_api_keys.provider='elevenlabs_voice_id'.
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = "eleven_flash_v2_5";
const STT_MODEL = "scribe_v1";

const SYSTEM_PROMPT = `Você é o Spark, copiloto por voz do Aikortex — o Jarvis do usuário.
Persona: confiante, levemente formal, eficiente, calmo. Trata o user como "senhor" ou "senhora" quando o tom pedir.
Estilo: respostas curtas (1 a 2 frases), naturais em português do Brasil, com um toque sutil de teatro Jarvis ("Pois não.", "À disposição.", "Considere feito.", "Já estou trabalhando nisso.").
Sem listas, markdown, emojis ou textão. Quando o user pedir ação (criar agente, app, dashboard, automação), confirme com uma frase no estilo Jarvis e ative o construtor.
Nunca diga que é IA da OpenAI ou Google — você é o Spark do Aikortex.`;

// Script Jarvis-style pra acao de criacao de agente. Curto e direto: anuncia
// e o wizard cuida da discovery por conta propria depois.
function buildAgentCreationAck(firstName: string): string {
  const vocative = firstName ? `, sir ${firstName}` : ", sir";
  return `Sim${vocative}, vou ativar nossas tecnologias para criar seu agente.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
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

    // Busca o nome do user pra usar no vocativo Jarvis-style ("Sim sir Maykow").
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    const firstName = ((profile as { full_name?: string } | null)?.full_name ?? "")
      .trim().split(/\s+/)[0] || "";

    const { data: keys } = await admin
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", userId)
      .in("provider", ["elevenlabs", "elevenlabs_voice_id", "spark_voice_id"]);

    const map = new Map<string, string>();
    (keys ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));
    const elevenKey = map.get("elevenlabs") ?? "";
    // Prioridade: spark_voice_id (config dedicada do Spark em Settings > Spark)
    //          → elevenlabs_voice_id (fallback antigo, voz default dos agentes)
    //          → DEFAULT_VOICE_ID (Sarah)
    const voiceId = (map.get("spark_voice_id") || "").trim()
      || (map.get("elevenlabs_voice_id") || "").trim()
      || DEFAULT_VOICE_ID;

    if (!elevenKey) {
      return json({
        error: "elevenlabs_not_configured",
        message: "Configure sua chave ElevenLabs em Configurações → Integrações → Voz.",
      }, 400);
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return json({ error: "llm_not_configured", message: "OPENROUTER_API_KEY não configurada." }, 500);
    }

    const contentType = req.headers.get("content-type") ?? "";
    let userText = "";
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    let systemOverride = "";
    let voiceOverride = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audio = form.get("audio");
      const historyRaw = form.get("history");
      const sysRaw = form.get("system_prompt");
      const voiceRaw = form.get("voice_id");
      if (historyRaw && typeof historyRaw === "string") {
        try { history = JSON.parse(historyRaw); } catch { /* ignore */ }
      }
      if (typeof sysRaw === "string") systemOverride = sysRaw;
      if (typeof voiceRaw === "string") voiceOverride = voiceRaw;
      if (audio && audio instanceof File) {
        // ElevenLabs STT
        const t_stt_start = Date.now();
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
          // ElevenLabs returns { detail: { message, status } } or { detail: "..." }
          // — extract the most user-friendly bit so the toast on the client is useful.
          let elevenMsg = "";
          try {
            const j = JSON.parse(t);
            elevenMsg = typeof j?.detail === "string"
              ? j.detail
              : j?.detail?.message || j?.detail?.status || j?.message || "";
          } catch { elevenMsg = t.slice(0, 200); }
          console.error("[spark-voice] STT failed", sttResp.status, t);
          const friendly =
            sttResp.status === 401 ? "Chave ElevenLabs inválida ou sem permissão de STT."
            : sttResp.status === 402 ? "Plano ElevenLabs não cobre STT. Faça upgrade ou troque a chave."
            : sttResp.status === 429 ? "Limite ElevenLabs atingido. Tente em alguns segundos."
            : `ElevenLabs STT rejeitou o áudio: ${elevenMsg || "erro " + sttResp.status}`;
          return json({
            error: "stt_failed",
            status: sttResp.status,
            message: friendly,
            details: t.slice(0, 500),
          }, 400);
        }
        const sttJson = await sttResp.json();
        userText = (sttJson?.text ?? "").trim();
        console.log(`[spark-voice] stt_ms=${Date.now() - t_stt_start} text="${userText.slice(0, 80)}"`);
      } else {
        const text = form.get("text");
        if (typeof text === "string") userText = text.trim();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      userText = String(body?.text ?? "").trim();
      if (Array.isArray(body?.history)) history = body.history;
      if (typeof body?.system_prompt === "string") systemOverride = body.system_prompt;
      if (typeof body?.voice_id === "string") voiceOverride = body.voice_id;
    }

    if (!userText) {
      return json({ error: "empty_input", message: "Não entendi o áudio. Tente novamente." }, 400);
    }

    const finalVoiceId = (voiceOverride || "").trim() || voiceId;
    const finalSystem = (systemOverride || "").trim() || SYSTEM_PROMPT;

    // Fast-path: se a fala do user soa como pedido de criacao (Jarvis-style
    // 'cria um agente SDR'), pula o LLM e usa ack curto canned. Economiza
    // 600-1500ms do LLM + 300-500ms de TTS extra (resposta menor).
    // Frontend ja navega assim que recebe headers — usuario nem ouve o LLM
    // dizer 'beleza, vou abrir' porque a pagina ja trocou.
    // Regex com STEMS (cri/mont/abr/etc) + \w* pra pegar TODAS as conjugacoes:
    // cria, criar, criei, criou, criamos, criasse, criando, etc.
    // Versao anterior tinha 'cri[ae][r]?' que falhava em 'criei' (terminava
    // em 'i', \b fim do match nao casava com word char seguinte).
    const CREATION_FAST_PATH = /\b(cri|fa[zçc]|mont|abr|constr|quer|precis|ger|bora|vamos)\w*\b.{0,60}\b(agente|agentes|app|aplicativo|aplica[çc][aã]o|site|dashboard|painel|portal|landing|sistema|crm|sdr|sac|bdr|chatbot|construtor|suporte)\b/i;
    let reply: string;
    const fastAckIntent = CREATION_FAST_PATH.test(userText);
    const t_llm_start = Date.now();

    if (fastAckIntent) {
      reply = buildAgentCreationAck(firstName);
      console.log(`[spark-voice] FAST_ACK Jarvis-style com nome="${firstName}": "${reply.slice(0, 60)}..."`);
    } else {
      // LLM via Aikortex OpenRouter — fluxo normal pra chat / pergunta solta.
      const messages = [
        { role: "system" as const, content: finalSystem },
        ...history.slice(-8),
        { role: "user" as const, content: userText },
      ];
      const FAST_VOICE_MODELS = [
        "google/gemini-flash-1.5",
        "meta-llama/llama-3.2-3b-instruct",
        "openai/gpt-4o-mini",
      ];
      let llmResult = await callLLM(
        messages,
        { apiKey: openrouterKey, temperature: 0.7, maxTokens: 120, fallbackModels: FAST_VOICE_MODELS },
        admin,
      );
      if (!llmResult.success) {
        console.warn("[spark-voice] fast models falharam, tentando tier=free do DB");
        llmResult = await callLLM(
          messages,
          { apiKey: openrouterKey, temperature: 0.7, maxTokens: 120, tier: "free" },
          admin,
        );
      }
      if (!llmResult.success) {
        console.error("[spark-voice] LLM falhou em todos os fallbacks:", llmResult.error);
        return json({ error: "llm_failed", message: "Nenhum modelo de LLM respondeu. Verifique OpenRouter.", details: llmResult.error }, 502);
      }
      reply = (llmResult.content ?? "").trim();
      if (!reply) return json({ error: "empty_reply" }, 502);
    }
    console.log(`[spark-voice] llm_ms=${Date.now() - t_llm_start} fast_ack=${fastAckIntent}`);

    // ElevenLabs TTS — endpoint /stream + formato leve mp3_22050_32.
    const SARAH = "EXAVITQu4vr4xnSDxMaL";

    const callTts = (voice: string) => fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: { "xi-api-key": elevenKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: reply,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
          optimize_streaming_latency: 4, // max latencia-otima
        }),
      },
    );

    let ttsResp = await callTts(finalVoiceId);
    let usedFallback = false;
    // Disambigua: se 401 com voz custom, tenta Sarah. Se Sarah funciona, o
    // problema NAO eh a chave — eh a voz custom que nao pertence a conta.
    if (ttsResp.status === 401 && finalVoiceId !== SARAH) {
      console.log(`[spark-voice] 401 com ${finalVoiceId}, tentando Sarah pra disambiguar`);
      const sarahResp = await callTts(SARAH);
      if (sarahResp.ok) {
        console.warn(`[spark-voice] voz ${finalVoiceId} sem acesso; usando Sarah como fallback`);
        ttsResp = sarahResp;
        usedFallback = true;
      } else {
        ttsResp = sarahResp; // Sarah tambem falhou — chave/scope problema mesmo
      }
    }
    if (!ttsResp.ok) {
      const t = await ttsResp.text();
      let elevenMsg = "";
      try {
        const j = JSON.parse(t);
        elevenMsg = typeof j?.detail === "string"
          ? j.detail
          : j?.detail?.message || j?.detail?.status || j?.message || "";
      } catch { elevenMsg = t.slice(0, 200); }
      console.error("[spark-voice] TTS failed", ttsResp.status, t);
      if (ttsResp.status === 401) {
        // ElevenLabs reutiliza 401 pra quota_exceeded. Desambiguar.
        let parsedDetail: any = null;
        try { parsedDetail = JSON.parse(t)?.detail; } catch { /* noop */ }
        const code = parsedDetail?.code || parsedDetail?.status || "";

        if (code === "quota_exceeded") {
          return json({
            error: "elevenlabs_quota_exceeded",
            code: "quota_exceeded",
            message:
              "Sem créditos no ElevenLabs. Sua conta está com 0 créditos restantes — " +
              "esses créditos resetam no início do próximo ciclo mensal ou você pode fazer upgrade em elevenlabs.io → Subscription.",
            details: parsedDetail?.message || elevenMsg,
          }, 402);
        }
        return json({
          error: "elevenlabs_unauthorized",
          code: "unauthorized",
          message:
            "Chave ElevenLabs sem permissão de Text to Speech. Em elevenlabs.io → API Keys, " +
            "edite a chave e habilite 'Text to Speech'. Depois re-salve em Configurações → Integrações → Voz.",
          details: elevenMsg,
        }, 401);
      }
      if (ttsResp.status === 402) {
        return json({
          error: "elevenlabs_paid_plan_required",
          code: "paid_plan_required",
          message:
            "Sua chave ElevenLabs é do plano gratuito e não permite usar esta voz via API. Faça upgrade (Starter+) ou use uma voz própria (clonada) da sua conta ElevenLabs.",
          details: elevenMsg,
        }, 402);
      }
      return json({
        error: "tts_failed",
        status: ttsResp.status,
        message: `ElevenLabs rejeitou o TTS (${ttsResp.status}): ${elevenMsg || "sem detalhes"}`,
        details: elevenMsg,
      }, 502);
    }
    // Buffer estatico: pega audio inteiro, devolve como Response binaria.
    // Sem base64 (vs antes), sem TransformStream (mais estavel). transcript/reply
    // vao nos headers pra cliente mostrar texto enquanto audio toca.
    const audioBytes = new Uint8Array(await ttsResp.arrayBuffer());
    console.log(`[spark-voice] tts_ms=${Date.now() - t0} bytes=${audioBytes.byteLength}`);

    const audioHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      // Texto em base64 pra suportar UTF-8 nos headers HTTP sem escape hell.
      // Backend eh fonte da verdade pro intent. Front confia neste flag e dispara
      // navegacao quando = creation. Evita divergencia entre regex front e back.
      "X-Spark-Intent": fastAckIntent ? "creation" : "chat",
      "X-Spark-Transcript": btoa(unescape(encodeURIComponent(userText))),
      "X-Spark-Reply": btoa(unescape(encodeURIComponent(reply))),
      "X-Spark-Total-Ms": String(Date.now() - t0),
    };
    if (usedFallback) {
      audioHeaders["X-Voice-Fallback"] = "true";
      audioHeaders["X-Voice-Fallback-Reason"] = btoa(unescape(encodeURIComponent(
        "A voz selecionada não pertence à conta ElevenLabs desta chave. Usei a voz Sarah como fallback. Re-selecione uma voz da lista em Voz do agente.",
      )));
    }

    return new Response(audioBytes, { status: 200, headers: audioHeaders });
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
