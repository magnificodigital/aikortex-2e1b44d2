// Edge function admin/agency-only: proxy pra APIs Telnyx + ElevenLabs com
// chave do user. Usado pra:
//   - Healthcheck (testa se a chave é válida)
//   - Listar números Telnyx comprados pela agência
//   - Listar vozes ElevenLabs (filtra pt-BR quando aplicável)
//
// Centralizado em 1 edge pra simplificar UI (1 helper só) e não expor as
// chaves no frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserApiKey(admin: any, userId: string, provider: string): Promise<string | null> {
  const { data } = await admin
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return (data as { api_key?: string } | null)?.api_key ?? null;
}

interface TelnyxNumber {
  id: string;
  phone_number: string;
  status: string;
  country_iso: string;
  connection_id?: string | null;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return jsonRes({ error: "UNAUTHORIZED" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return jsonRes({ error: "INVALID_TOKEN" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { provider?: string; action?: string } = {};
  try { body = await req.json(); } catch { return jsonRes({ error: "INVALID_JSON" }, 400); }

  const { provider, action } = body;
  if (!provider || !action) return jsonRes({ error: "MISSING_FIELDS", message: "provider e action obrigatórios" }, 400);

  try {
    if (provider === "telnyx") {
      const apiKey = await getUserApiKey(admin, userData.user.id, "telnyx");
      if (!apiKey) return jsonRes({ error: "KEY_MISSING", message: "Chave Telnyx não configurada" }, 400);

      if (action === "test") {
        // Healthcheck: busca balance da conta (endpoint leve que confirma a chave)
        const resp = await fetch("https://api.telnyx.com/v2/balance", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (resp.status === 401) return jsonRes({ ok: false, error: "INVALID_KEY", message: "Chave Telnyx rejeitada" }, 200);
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          return jsonRes({ ok: false, error: "TELNYX_ERROR", message: `HTTP ${resp.status}: ${text.slice(0, 150)}` }, 200);
        }
        const json = await resp.json();
        return jsonRes({
          ok: true,
          balance: json.data?.balance ?? null,
          currency: json.data?.currency ?? "USD",
        });
      }

      if (action === "phone_numbers") {
        // Lista números comprados (até 200) pra dropdown na UI
        const resp = await fetch("https://api.telnyx.com/v2/phone_numbers?page[size]=200&filter[status]=active", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          return jsonRes({ ok: false, error: "TELNYX_ERROR", message: `HTTP ${resp.status}: ${text.slice(0, 150)}` }, 200);
        }
        const json = await resp.json();
        const numbers: TelnyxNumber[] = (json.data ?? []).map((n: any) => ({
          id: n.id,
          phone_number: n.phone_number,
          status: n.status,
          country_iso: n.country_iso ?? "BR",
          connection_id: n.connection_id ?? null,
        }));
        return jsonRes({ ok: true, numbers });
      }

      return jsonRes({ error: "INVALID_ACTION", validActions: ["test", "phone_numbers"] }, 400);
    }

    if (provider === "elevenlabs") {
      const apiKey = await getUserApiKey(admin, userData.user.id, "elevenlabs");
      if (!apiKey) return jsonRes({ error: "KEY_MISSING", message: "Chave ElevenLabs não configurada" }, 400);

      if (action === "test") {
        // Validação 2-em-1:
        // (1) GET /v1/voices  — checa que a chave é aceita pelo ElevenLabs
        // (2) POST /v1/text-to-speech/{sarah} com 1 char — checa que tem o
        //     SCOPE 'text_to_speech' habilitado. Sem isso, agente quebra com
        //     401 na hora da ligação mesmo a chave sendo "válida".
        const voicesResp = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey },
        });
        if (voicesResp.status === 401) {
          return jsonRes({ ok: false, error: "INVALID_KEY", message: "Chave ElevenLabs rejeitada" }, 200);
        }
        if (!voicesResp.ok) {
          const text = await voicesResp.text().catch(() => "");
          return jsonRes({ ok: false, error: "ELEVENLABS_ERROR", message: `HTTP ${voicesResp.status}: ${text.slice(0, 150)}` }, 200);
        }

        // Dry-run TTS com Sarah (voz default, disponivel em qualquer conta).
        // 1 char = 1 credit. Custo despreziveis pro feedback que entrega.
        const ttsResp = await fetch(
          "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_44100_128",
          {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ text: ".", model_id: "eleven_flash_v2_5" }),
          },
        );
        if (ttsResp.status === 401) {
          return jsonRes({
            ok: false,
            error: "MISSING_TTS_SCOPE",
            message: "Chave válida, mas SEM permissão de Text to Speech. Em elevenlabs.io → API Keys, edite a chave e marque 'Text to Speech'.",
          }, 200);
        }
        if (ttsResp.status === 402) {
          return jsonRes({
            ok: false,
            error: "PAID_PLAN_REQUIRED",
            message: "Chave válida, mas o plano gratuito ElevenLabs não permite TTS via API. Faça upgrade para Starter+ ou use uma voz clonada da sua conta.",
          }, 200);
        }
        if (!ttsResp.ok) {
          const text = await ttsResp.text().catch(() => "");
          return jsonRes({
            ok: false,
            error: "TTS_FAILED",
            message: `Voices OK, mas TTS falhou (HTTP ${ttsResp.status}): ${text.slice(0, 150)}`,
          }, 200);
        }
        return jsonRes({ ok: true });
      }

      if (action === "voices") {
        const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey },
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          return jsonRes({ ok: false, error: "ELEVENLABS_ERROR", message: `HTTP ${resp.status}: ${text.slice(0, 150)}` }, 200);
        }
        const json = await resp.json();
        const voices: ElevenLabsVoice[] = (json.voices ?? []).map((v: any) => {
          // Detecta português brasileiro via labels (ElevenLabs adiciona "ptbr"
          // ou "portuguese" em descriptions/labels). Heurística simples.
          const labels = v.labels ?? {};
          const lang = String(labels.language ?? labels.accent ?? "")
            .toLowerCase()
            .replace(/[\s-_]/g, "");
          const isPtBr = /ptbr|portuguese|brazil|brasil/i.test(lang)
            || /portuguese|brazil|brasil/i.test(v.description ?? "");
          return {
            voice_id: v.voice_id,
            name: v.name,
            language: isPtBr ? "pt-BR" : labels.language ?? "en",
            gender: labels.gender ?? null,
            preview_url: v.preview_url ?? null,
            category: v.category ?? null,
          };
        });
        // Ordena: pt-BR primeiro, depois alphabetical
        voices.sort((a, b) => {
          if (a.language === "pt-BR" && b.language !== "pt-BR") return -1;
          if (b.language === "pt-BR" && a.language !== "pt-BR") return 1;
          return a.name.localeCompare(b.name);
        });
        return jsonRes({ ok: true, voices, total: voices.length });
      }

      return jsonRes({ error: "INVALID_ACTION", validActions: ["test", "voices"] }, 400);
    }

    return jsonRes({ error: "INVALID_PROVIDER", validProviders: ["telnyx", "elevenlabs"] }, 400);
  } catch (e) {
    console.error("[voice-resources] error:", e);
    return jsonRes({ error: "INTERNAL", message: String(e) }, 500);
  }
});
