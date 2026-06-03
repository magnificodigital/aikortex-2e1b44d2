// Sync OUTBOUND: Aikortex crm_contacts → HubSpot
//
// Body: { contact_id: string }
//
// Fluxo:
// 1. Carrega o contact + agency sync config
// 2. Se já tem external_ids.hubspot_contact_id → UPDATE_CONTACT
//    Senão → CREATE_CONTACT (e salva o ID retornado)
// 3. Mesmo pra deal: se hubspot_deal_id existe → UPDATE_DEAL
//    Senão → CREATE_DEAL no pipeline configurado (com association ao contact)
// 4. Loga cada operação em crm_sync_logs

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { executeAction } from "../_shared/composio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SyncConfig {
  id: string;
  agency_id: string;
  provider: string;
  enabled: boolean;
  hubspot_pipeline_id: string | null;
  stage_mapping: Record<string, string>;
  auto_sync: boolean;
  total_synced: number;
}

interface Contact {
  id: string;
  agency_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  stage_slug: string;
  temperature: string | null;
  budget: string | null;
  authority: string | null;
  need: string | null;
  timeline: string | null;
  notes: string | null;
  external_ids: Record<string, string>;
  primary_agent_id: string | null;
}

async function logOp(opts: {
  admin: ReturnType<typeof createClient>;
  agencyId: string;
  contactId: string;
  action: string;
  status: "success" | "error" | "skipped";
  externalId?: string | null;
  errorMessage?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  durationMs?: number;
}): Promise<void> {
  await opts.admin.from("crm_sync_logs").insert({
    agency_id: opts.agencyId,
    contact_id: opts.contactId,
    provider: "hubspot",
    direction: "push",
    action: opts.action,
    status: opts.status,
    external_id: opts.externalId ?? null,
    error_message: opts.errorMessage ?? null,
    request_payload: opts.requestPayload ?? null,
    response_payload: opts.responsePayload ?? null,
    duration_ms: opts.durationMs ?? null,
  });
}

// Composio response wrappers podem vir em shapes diferentes; normaliza
function extractData(resp: unknown): Record<string, unknown> {
  const r = resp as { result?: { data?: unknown }; data?: unknown };
  return (r?.result?.data ?? r?.data ?? resp ?? {}) as Record<string, unknown>;
}
function extractId(resp: unknown): string | null {
  const d = extractData(resp);
  const id = d.id ?? (d as { hs_object_id?: string }).hs_object_id ?? null;
  return id ? String(id) : null;
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Chamadas internas (trigger DB → pg_net) usam service_role. Detectamos
  // e resolvemos user_id via contact.agency_id → agency_profiles.user_id.
  const isInternal = jwt === serviceKey;

  let body: { contact_id?: string };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  const contactId = String(body.contact_id ?? "");
  if (!contactId) return json({ error: "MISSING_CONTACT_ID" }, 400);

  let userId: string;
  let agencyId: string;

  if (isInternal) {
    // Resolve user_id a partir do contact.agency_id
    const { data: c } = await admin
      .from("crm_contacts")
      .select("agency_id")
      .eq("id", contactId)
      .maybeSingle();
    const cAgencyId = (c as { agency_id?: string } | null)?.agency_id;
    if (!cAgencyId) return json({ error: "CONTACT_NOT_FOUND" }, 404);
    const { data: a } = await admin
      .from("agency_profiles")
      .select("user_id")
      .eq("id", cAgencyId)
      .maybeSingle();
    const aUserId = (a as { user_id?: string } | null)?.user_id;
    if (!aUserId) return json({ error: "AGENCY_OWNER_NOT_FOUND" }, 404);
    userId = aUserId;
    agencyId = cAgencyId;
  } else {
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "INVALID_TOKEN" }, 401);
    userId = userData.user.id;
    const { data: agency } = await admin
      .from("agency_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const resolvedAgencyId = (agency as { id?: string } | null)?.id;
    if (!resolvedAgencyId) return json({ error: "NO_AGENCY" }, 403);
    agencyId = resolvedAgencyId;
  }

  // Carrega config de sync
  const { data: configRow } = await admin
    .from("crm_sync_configs")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("provider", "hubspot")
    .maybeSingle();
  const config = configRow as SyncConfig | null;
  if (!config) {
    return json({
      error: "NOT_CONFIGURED",
      detail: "Configure o sync com HubSpot em Configurações → Conectores → HubSpot Sync.",
    }, 400);
  }
  if (!config.enabled) {
    return json({ error: "DISABLED", detail: "Sync com HubSpot está desativado." }, 400);
  }

  // Carrega contato
  const { data: contactRow } = await admin
    .from("crm_contacts")
    .select("*")
    .eq("id", contactId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  const contact = contactRow as Contact | null;
  if (!contact) return json({ error: "CONTACT_NOT_FOUND" }, 404);

  const externalIds: Record<string, string> = { ...(contact.external_ids ?? {}) };
  const existingHsContactId = externalIds.hubspot_contact_id ?? null;
  const existingHsDealId = externalIds.hubspot_deal_id ?? null;

  // ── 1. Sync Contact ─────────────────────────────────────────────────
  const contactProps: Record<string, unknown> = {};
  if (contact.email) contactProps.email = contact.email;
  if (contact.name) {
    const parts = contact.name.split(" ");
    contactProps.firstname = parts[0];
    if (parts.length > 1) contactProps.lastname = parts.slice(1).join(" ");
  }
  if (contact.phone) contactProps.phone = contact.phone;
  if (contact.company) contactProps.company = contact.company;
  if (contact.role) contactProps.jobtitle = contact.role;

  let hsContactId = existingHsContactId;
  try {
    const start = Date.now();
    if (existingHsContactId) {
      // UPDATE
      await executeAction(userId, "HUBSPOT_UPDATE_CONTACT", {
        contact_id: existingHsContactId,
        ...contactProps,
      });
      await logOp({
        admin, agencyId, contactId, action: "update_contact",
        status: "success", externalId: existingHsContactId,
        requestPayload: contactProps, durationMs: Date.now() - start,
      });
    } else {
      // CREATE
      const resp = await executeAction(userId, "HUBSPOT_CREATE_CONTACT", contactProps);
      hsContactId = extractId(resp);
      await logOp({
        admin, agencyId, contactId, action: "create_contact",
        status: "success", externalId: hsContactId,
        requestPayload: contactProps, responsePayload: resp,
        durationMs: Date.now() - start,
      });
      if (hsContactId) externalIds.hubspot_contact_id = hsContactId;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await logOp({
      admin, agencyId, contactId,
      action: existingHsContactId ? "update_contact" : "create_contact",
      status: "error", errorMessage: msg, requestPayload: contactProps,
    });
    await admin.from("crm_sync_configs")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: msg })
      .eq("id", config.id);
    return json({ error: "CONTACT_SYNC_FAILED", message: msg }, 500);
  }

  // ── 2. Sync Deal ────────────────────────────────────────────────────
  // Mapping Aikortex stage → HubSpot dealstage. Se mapping não existir,
  // pula a criação do Deal (Contact já sincronizou).
  const hsDealStage = (config.stage_mapping ?? {})[contact.stage_slug];
  let hsDealId = existingHsDealId;

  if (hsDealStage && config.hubspot_pipeline_id) {
    const dealProps: Record<string, unknown> = {
      dealname: contact.name ? `Deal — ${contact.name}` : "Deal — Sem nome",
      dealstage: hsDealStage,
      pipeline: config.hubspot_pipeline_id,
    };
    if (contact.budget) {
      // Extrai número de strings tipo "R$ 50k/mês", "3.000.000", etc.
      const numMatch = contact.budget.replace(/\./g, "").match(/(\d+)/);
      if (numMatch) dealProps.amount = parseInt(numMatch[1], 10);
    }

    try {
      const start = Date.now();
      if (existingHsDealId) {
        await executeAction(userId, "HUBSPOT_UPDATE_DEAL", {
          deal_id: existingHsDealId,
          ...dealProps,
        });
        await logOp({
          admin, agencyId, contactId, action: "update_deal",
          status: "success", externalId: existingHsDealId,
          requestPayload: dealProps, durationMs: Date.now() - start,
        });
      } else {
        const createPayload: Record<string, unknown> = { ...dealProps };
        if (hsContactId) createPayload.associated_contact_ids = [hsContactId];
        const resp = await executeAction(userId, "HUBSPOT_CREATE_DEAL", createPayload);
        hsDealId = extractId(resp);
        await logOp({
          admin, agencyId, contactId, action: "create_deal",
          status: "success", externalId: hsDealId,
          requestPayload: createPayload, responsePayload: resp,
          durationMs: Date.now() - start,
        });
        if (hsDealId) externalIds.hubspot_deal_id = hsDealId;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Erro no Deal NÃO impede sucesso do Contact (parcial = sucesso parcial)
      await logOp({
        admin, agencyId, contactId,
        action: existingHsDealId ? "update_deal" : "create_deal",
        status: "error", errorMessage: msg, requestPayload: dealProps,
      });
      console.warn(`[crm-hubspot-push] deal sync failed for ${contactId}:`, msg);
    }
  } else {
    await logOp({
      admin, agencyId, contactId, action: "create_deal",
      status: "skipped",
      errorMessage: !hsDealStage
        ? `Stage "${contact.stage_slug}" não mapeado pra HubSpot dealstage.`
        : "hubspot_pipeline_id não configurado.",
    });
  }

  // ── 3. Persiste external_ids no contato ─────────────────────────────
  await admin.from("crm_contacts")
    .update({ external_ids: externalIds })
    .eq("id", contactId);

  // ── 4. Atualiza estatísticas do config ──────────────────────────────
  await admin.from("crm_sync_configs")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
      total_synced: (config.total_synced ?? 0) + 1,
    })
    .eq("id", config.id);

  return json({
    ok: true,
    contact_id: contactId,
    hubspot_contact_id: hsContactId,
    hubspot_deal_id: hsDealId,
    deal_synced: !!hsDealStage,
  });
});
