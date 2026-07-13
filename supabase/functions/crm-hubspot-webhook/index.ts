// Sprint 2.3 — INBOUND webhook HubSpot → Aikortex
//
// HubSpot envia eventos de propertyChange aqui. Para cada evento:
// 1. Localiza crm_contacts pelo external_ids.hubspot_contact_id ou _deal_id
// 2. Mapeia propriedade HubSpot → coluna Aikortex
// 3. Atualiza crm_contacts (set last_inbound_at = now() pra prevenir loop)
// 4. Registra em crm_sync_logs com direction = 'pull'
//
// Autenticação: URL contém ?token=<webhook_token> da agência.
// Token é gerado por agência e fica em crm_sync_configs.webhook_token.
//
// Public function (verify_jwt = false). Sem token válido na URL → 401.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface HubSpotEvent {
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  eventId?: number;
  subscriptionType?: string;
  subscriptionId?: number;
  portalId?: number;
  appId?: number;
  occurredAt?: number;
  attemptNumber?: number;
}

// Mapping de propriedade HubSpot → coluna do crm_contacts
const HS_TO_AIKORTEX: Record<string, string> = {
  email: "email",
  firstname: "_firstname", // compose com lastname
  lastname: "_lastname",
  phone: "phone",
  company: "company",
  jobtitle: "role",
  // lifecyclestage mapeia stage_slug (mapeamento reverso baseado em config)
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Valida webhook_token da URL
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token || token.length < 16) return json({ error: "MISSING_TOKEN" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve agency_id e config pelo token
  const { data: configRow } = await admin
    .from("crm_sync_configs")
    .select("*")
    .eq("webhook_token", token)
    .eq("provider", "hubspot")
    .maybeSingle();
  const config = configRow as {
    id: string;
    agency_id: string;
    inbound_enabled: boolean;
    stage_mapping: Record<string, string>;
  } | null;

  if (!config) return json({ error: "INVALID_TOKEN" }, 401);
  if (!config.inbound_enabled) {
    return json({ ok: true, skipped: "inbound_disabled" });
  }

  // HubSpot envia array de eventos no body
  let body: unknown;
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  const events: HubSpotEvent[] = Array.isArray(body) ? body as HubSpotEvent[] : [body as HubSpotEvent];

  // Reverse mapping: HubSpot dealstage → Aikortex stage_slug
  const reverseStageMap: Record<string, string> = {};
  for (const [aikSlug, hsStage] of Object.entries(config.stage_mapping ?? {})) {
    reverseStageMap[String(hsStage)] = aikSlug;
  }

  // Reverse lifecyclestage map (oposto do que o push usa)
  const reverseLifecycle: Record<string, string> = {
    lead: "new",
    marketingqualifiedlead: "qualified",
    salesqualifiedlead: "meeting_scheduled",
    opportunity: "meeting_scheduled",
    customer: "won",
  };

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ event_id?: number; error: string }> = [];

  for (const ev of events) {
    processed++;
    const subscriptionType = String(ev.subscriptionType ?? "");
    const propName = String(ev.propertyName ?? "");
    const propValue = ev.propertyValue ?? null;
    const objectId = String(ev.objectId);

    try {
      // Determina se é update de Contact ou de Deal
      const isContactEvent = subscriptionType.startsWith("contact.");
      const isDealEvent = subscriptionType.startsWith("deal.");
      if (!isContactEvent && !isDealEvent) {
        skipped++;
        continue;
      }

      // Localiza crm_contact pelo external_id correspondente
      const idKey = isContactEvent ? "hubspot_contact_id" : "hubspot_deal_id";
      const { data: contact } = await admin
        .from("crm_contacts")
        .select("id, name, agency_id, external_ids")
        .eq("agency_id", config.agency_id)
        .filter(`external_ids->>${idKey}`, "eq", objectId)
        .maybeSingle();

      if (!contact) {
        skipped++;
        await admin.from("crm_sync_logs").insert({
          agency_id: config.agency_id,
          contact_id: null,
          provider: "hubspot",
          direction: "pull",
          action: isContactEvent ? "update_contact" : "update_deal",
          status: "skipped",
          external_id: objectId,
          error_message: `Contact not found locally for ${idKey}=${objectId}`,
          metadata: { event: ev },
        });
        continue;
      }

      const updates: Record<string, unknown> = {
        last_inbound_at: new Date().toISOString(),
      };

      if (isContactEvent) {
        const aikColumn = HS_TO_AIKORTEX[propName];
        if (aikColumn === "_firstname" || aikColumn === "_lastname") {
          // Recompõe nome a partir do estado atual + a mudança recebida
          // Idealmente buscaríamos firstname/lastname juntos, mas pra MVP
          // só atualizamos o campo name pegando primeiro nome do propValue
          // (HubSpot envia firstname e lastname em eventos separados).
          // Pra robustez total, idealmente faria GET no contato e
          // recomporia. Pra agora deixamos só salvar o que veio.
          const currentName = (contact as { name?: string }).name ?? "";
          if (aikColumn === "_firstname") {
            const parts = currentName.split(" ");
            const rest = parts.slice(1).join(" ");
            updates.name = String(propValue ?? "") + (rest ? " " + rest : "");
          } else {
            const parts = currentName.split(" ");
            const first = parts[0] ?? "";
            updates.name = first + " " + String(propValue ?? "");
          }
        } else if (aikColumn) {
          updates[aikColumn] = propValue;
        } else if (propName === "lifecyclestage") {
          const aikSlug = reverseLifecycle[String(propValue ?? "")];
          if (aikSlug) updates.stage_slug = aikSlug;
        } else {
          // Propriedade não mapeada — skip silencioso
          skipped++;
          continue;
        }
      } else {
        // Deal event
        if (propName === "dealstage") {
          const aikSlug = reverseStageMap[String(propValue ?? "")];
          if (aikSlug) {
            updates.stage_slug = aikSlug;
          } else {
            skipped++;
            continue;
          }
        } else {
          // Outras props de Deal por enquanto não atualizam Aikortex
          skipped++;
          continue;
        }
      }

      const { error: updErr } = await admin
        .from("crm_contacts")
        .update(updates)
        .eq("id", (contact as { id: string }).id);

      if (updErr) throw new Error(updErr.message);
      updated++;

      await admin.from("crm_sync_logs").insert({
        agency_id: config.agency_id,
        contact_id: (contact as { id: string }).id,
        provider: "hubspot",
        direction: "pull",
        action: isContactEvent ? "update_contact" : "update_deal",
        status: "success",
        external_id: objectId,
        metadata: { property: propName, value: propValue, event: ev },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ event_id: ev.eventId, error: msg });
      await admin.from("crm_sync_logs").insert({
        agency_id: config.agency_id,
        contact_id: null,
        provider: "hubspot",
        direction: "pull",
        action: "update_contact",
        status: "error",
        external_id: objectId,
        error_message: msg,
        metadata: { event: ev },
      });
    }
  }

  return json({ ok: true, processed, updated, skipped, errors: errors.slice(0, 10) });
});
