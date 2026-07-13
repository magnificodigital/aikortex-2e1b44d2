// Sprint B — Envia convite por email pro cliente cadastrado pela agência.
//
// Body: { client_id }
// 1. Valida que current user é dono da agência DO cliente
// 2. Resolve agency_name pro corpo do email
// 3. Manda email via Resend trial (mesmo caminho do send-cadence-step)
// 4. Atualiza agency_clients.status = 'pending' (vai virar 'active' quando
//    o cliente finalizar o cadastro na página /client/:token)
//
// Link no email: https://agents.aikortex.com/client/{client_id}

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_URL = "https://agents.aikortex.com";
const AIKORTEX_RESEND_API_KEY = Deno.env.get("AIKORTEX_RESEND_API_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AgencyClientRow {
  id: string;
  agency_id: string;
  client_name: string | null;
  client_email: string | null;
  status: string | null;
}

interface AgencyProfileRow {
  id: string;
  user_id: string;
  agency_name: string | null;
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

  let body: { client_id?: string };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  const clientId = String(body.client_id ?? "").trim();
  if (!clientId) return json({ error: "MISSING_CLIENT_ID" }, 400);

  // Carrega cliente
  const { data: clientRow } = await admin
    .from("agency_clients")
    .select("id, agency_id, client_name, client_email, status")
    .eq("id", clientId)
    .maybeSingle();
  const client = clientRow as AgencyClientRow | null;
  if (!client) return json({ error: "CLIENT_NOT_FOUND" }, 404);
  if (!client.client_email) {
    return json({ error: "NO_EMAIL", detail: "Cliente sem email cadastrado." }, 400);
  }

  // Confere ownership: current user precisa ser dono da agência
  const { data: agencyRow } = await admin
    .from("agency_profiles")
    .select("id, user_id, agency_name")
    .eq("id", client.agency_id)
    .maybeSingle();
  const agency = agencyRow as AgencyProfileRow | null;
  if (!agency) return json({ error: "AGENCY_NOT_FOUND" }, 404);
  if (agency.user_id !== userData.user.id) {
    return json({ error: "FORBIDDEN", detail: "Cliente não pertence à sua agência." }, 403);
  }

  if (!AIKORTEX_RESEND_API_KEY) {
    return json({ error: "NO_RESEND_CONFIG", detail: "Aikortex Resend não configurado." }, 500);
  }

  const inviteUrl = `${APP_URL}/client/${client.id}`;
  const agencyName = agency.agency_name || "sua agência";
  const clientFirstName = (client.client_name || "").trim().split(" ")[0] || "tudo bem?";

  const subject = `Convite: ${agencyName} te criou um acesso no Aikortex`;
  const text = `Olá ${clientFirstName}!

${agencyName} criou uma conta pra você no Aikortex — a plataforma onde você vai acompanhar os agentes de IA configurados pra sua empresa.

Pra finalizar seu cadastro e criar uma senha, clica no link abaixo:

${inviteUrl}

O link é único e foi gerado pra você. Se não foi você que solicitou, pode ignorar este email.

Time Aikortex 🚀`;

  const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Olá ${clientFirstName}!</h1>
  <p style="font-size: 15px; line-height: 1.6;"><strong>${agencyName}</strong> criou uma conta pra você no Aikortex — a plataforma onde você vai acompanhar os agentes de IA configurados pra sua empresa.</p>
  <p style="font-size: 15px; line-height: 1.6;">Pra finalizar seu cadastro e criar uma senha, clica no botão abaixo:</p>
  <p style="margin: 28px 0;"><a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none;">Finalizar cadastro</a></p>
  <p style="font-size: 13px; color: #666;">Ou cole esse link no navegador: <br><a href="${inviteUrl}" style="color: #6366f1; word-break: break-all;">${inviteUrl}</a></p>
  <p style="font-size: 12px; color: #999; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">O link é único e foi gerado pra você. Se não foi você que solicitou, pode ignorar este email.</p>
  <p style="font-size: 12px; color: #999;">Time Aikortex 🚀</p>
</body></html>`;

  const fromHeader = `${agencyName} via Aikortex <cortesia@sendmail.aikortex.com>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIKORTEX_RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromHeader,
      to: client.client_email,
      subject,
      text,
      html,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[client-invite] resend ${resp.status}:`, errText.slice(0, 300));
    return json({ error: "RESEND_FAILED", detail: errText.slice(0, 300) }, 502);
  }

  // Marca status como pending pra UI da agência saber que o convite saiu
  await admin
    .from("agency_clients")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", clientId);

  console.log(`[client-invite] ✓ enviado pra ${client.client_email} (cliente ${clientId})`);
  return json({
    ok: true,
    sent_to: client.client_email,
    invite_url: inviteUrl,
  });
});
