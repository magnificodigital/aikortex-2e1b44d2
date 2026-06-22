// Edge function: healthcheck-llm-models
// Standalone mode: POST { models: string[] } → pinga cada modelo sem usar a tabela
// DB mode: POST {} → busca todos os modelos active=true em available_llms,
//                    pinga cada um, atualiza status/last_health_check_at/error
//
// Resposta: { results: [{ model_id, ok, status_code, latency_ms, content_preview, error }], summary: {...} }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PING_MESSAGES = [{ role: "user", content: "ping" }];
const TIMEOUT_MS = 15000;

type PingResult = {
  model_id: string;
  ok: boolean;
  status_code: number;
  latency_ms: number;
  content_preview?: string;
  error?: string;
};

async function pingModel(model_id: string, apiKey: string): Promise<PingResult> {
  const t0 = Date.now();
  try {
    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aikortex26.lovable.app",
        "X-Title": "Aikortex",
      },
      body: JSON.stringify({
        model: model_id,
        messages: PING_MESSAGES,
        max_tokens: 16,
        stream: false,
      }),
    });
    const latency = Date.now() - t0;
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return {
        model_id,
        ok: false,
        status_code: resp.status,
        latency_ms: latency,
        error: errText.slice(0, 300),
      };
    }
    const data = await resp.json();
    const msg = data?.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning || "";
    if (!content) {
      return {
        model_id,
        ok: false,
        status_code: 200,
        latency_ms: latency,
        error: "empty content",
      };
    }
    return {
      model_id,
      ok: true,
      status_code: 200,
      latency_ms: latency,
      content_preview: String(content).slice(0, 80),
    };
  } catch (e) {
    return {
      model_id,
      ok: false,
      status_code: 0,
      latency_ms: Date.now() - t0,
      error: (e as Error).message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: aceita service role (cron interno) OU JWT de platform_owner/
  // platform_admin (UI do admin clicando "Healthcheck geral").
  // Bug visto: UI batia com JWT do user e tomava 401 porque só service
  // role era aceito. Atacante random ainda não passa (precisa ser admin).
  const authHeader = req.headers.get("Authorization") || "";
  const callerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!callerToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isServiceRole = callerToken === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!isServiceRole) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(callerToken);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "INVALID_TOKEN" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const role = (profile as { role?: string } | null)?.role;
    if (role !== "platform_owner" && role !== "platform_admin") {
      return new Response(JSON.stringify({ error: "FORBIDDEN", message: "Apenas admin Aikortex" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY ausente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { models?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let modelIds: string[] = [];
  let dbMode = false;

  if (Array.isArray(body.models) && body.models.length > 0) {
    modelIds = body.models;
  } else {
    // DB mode
    dbMode = true;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase
      .from("available_llms")
      .select("model_id")
      .eq("active", true);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    modelIds = (data ?? []).map((m: any) => m.model_id);
  }

  // Sequencial pra evitar rate-limit cruzado
  const results: PingResult[] = [];
  for (const id of modelIds) {
    const r = await pingModel(id, apiKey);
    console.log(
      `[healthcheck] ${id} ok=${r.ok} status=${r.status_code} latency=${r.latency_ms}ms ${r.error ?? ""}`,
    );
    results.push(r);
  }

  // DB mode: persistir status
  if (dbMode) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    for (const r of results) {
      const { data: row } = await supabase
        .from("available_llms")
        .select("consecutive_failures")
        .eq("model_id", r.model_id)
        .maybeSingle();
      if (r.ok) {
        await supabase
          .from("available_llms")
          .update({
            status: "healthy",
            consecutive_failures: 0,
            last_health_check_at: new Date().toISOString(),
            last_health_check_error: null,
          })
          .eq("model_id", r.model_id);
      } else {
        const failures = (row?.consecutive_failures ?? 0) + 1;
        const newStatus = failures >= 5 ? "dead" : failures >= 2 ? "degraded" : "healthy";
        await supabase
          .from("available_llms")
          .update({
            status: newStatus,
            consecutive_failures: failures,
            last_health_check_at: new Date().toISOString(),
            last_health_check_error: `HTTP ${r.status_code}: ${(r.error ?? "").slice(0, 200)}`,
          })
          .eq("model_id", r.model_id);
      }
    }
  }

  const summary = {
    total: results.length,
    healthy: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    avg_latency_ms: results.length
      ? Math.round(results.reduce((a, b) => a + b.latency_ms, 0) / results.length)
      : 0,
  };

  return new Response(JSON.stringify({ mode: dbMode ? "db" : "standalone", summary, results }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
