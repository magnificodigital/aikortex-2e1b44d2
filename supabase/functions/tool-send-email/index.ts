// Tool: send_email
// Chamada pelo runtime do agente quando o LLM decide enviar email.
// Reusa o caminho Resend (BYOK da agência ou trial Aikortex) já validado em
// send-cadence-step — sem duplicar regra de compliance/opt-out.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AIKORTEX_RESEND_API_KEY = Deno.env.get("AIKORTEX_RESEND_API_KEY") ?? "";
const TRIAL_LIMIT = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json({ error: "UNAUTHORIZED" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "INVALID_TOKEN" }, 401);
  const userId = userData.user.id;

  let body: { to?: string; subject?: string; body?: string; agent_id?: string };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const content = String(body.body ?? "").trim();

  if (!isEmail(to)) return json({ error: "INVALID_EMAIL", detail: `'${to}' não é email válido` }, 400);
  if (!subject) return json({ error: "MISSING_SUBJECT" }, 400);
  if (!content) return json({ error: "MISSING_BODY" }, 400);

  // Resolve agência do user (mesma lógica do send-cadence-step)
  const { data: agency } = await admin
    .from("agency_profiles")
    .select("id, agency_name, email_trial_used")
    .eq("user_id", userId)
    .maybeSingle();
  if (!agency?.id) {
    return json({ error: "NO_AGENCY", detail: "Conta não está vinculada a uma agência." }, 403);
  }

  const { data: secrets } = await admin
    .from("agency_secrets")
    .select("resend_api_key, resend_from_email, default_from_name, default_reply_to")
    .eq("agency_user_id", userId)
    .maybeSingle();

  let apiKey = "";
  let fromEmail = "";
  let fromName: string | null = (secrets?.default_from_name ?? "").toString().trim() || null;
  const replyTo: string | null = (secrets?.default_reply_to ?? "").toString().trim() || null;
  let isTrial = false;

  if (secrets?.resend_api_key) {
    apiKey = secrets.resend_api_key;
    fromEmail = (secrets.resend_from_email ?? "").trim();
    if (!fromEmail) {
      return json({
        error: "MISSING_FROM_EMAIL",
        detail: "Configure o email do remetente em Configurações → Integrações → Email.",
      }, 400);
    }
  } else if ((agency.email_trial_used ?? 0) < TRIAL_LIMIT && AIKORTEX_RESEND_API_KEY) {
    apiKey = AIKORTEX_RESEND_API_KEY;
    fromEmail = "cortesia@sendmail.aikortex.com";
    fromName = "Aikortex (cortesia)";
    isTrial = true;
  } else if ((agency.email_trial_used ?? 0) >= TRIAL_LIMIT) {
    return json({
      error: "TRIAL_EXHAUSTED",
      detail: "Trial de cortesia esgotado. Configure sua chave Resend em Configurações → Integrações → Email.",
    }, 402);
  } else {
    return json({ error: "NO_RESEND_CONFIG", detail: "Resend não configurado." }, 500);
  }

  const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const isHtml = /<\w+[^>]*>/.test(content);
  const payload: Record<string, unknown> = {
    from: fromHeader,
    to,
    subject,
    text: isHtml ? content.replace(/<[^>]+>/g, "") : content,
  };
  if (isHtml) payload.html = content;
  if (replyTo) payload.reply_to = replyTo;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[tool-send-email] resend ${resp.status}:`, errText.slice(0, 300));
    return json({ error: "RESEND_FAILED", status: resp.status, detail: errText.slice(0, 300) }, 502);
  }
  const result = await resp.json().catch(() => ({}));

  if (isTrial) {
    await admin.rpc("increment_email_trial", { p_agency_id: agency.id }).catch(() => null);
  }

  console.log(`[tool-send-email] ✓ enviado pra ${to} via ${isTrial ? "trial" : "BYOK"}`);
  return json({
    ok: true,
    email_id: (result as { id?: string }).id ?? null,
    from: fromHeader,
    to,
    subject,
    trial: isTrial,
  });
});
