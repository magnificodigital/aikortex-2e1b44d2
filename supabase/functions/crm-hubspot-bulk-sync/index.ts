// Bulk sync: enfileira todos os crm_contacts da agência que ainda não têm
// hubspot_contact_id. Cada contact é processado em sequência via crm-hubspot-push
// (mesma lógica, pra reaproveitar logs + tratamento de erro).
//
// Resposta: { total, succeeded, failed, errors }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json({ error: "UNAUTHORIZED" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "INVALID_TOKEN" }, 401);

  // Resolve agency
  const { data: agency } = await admin
    .from("agency_profiles")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const agencyId = (agency as { id?: string } | null)?.id;
  if (!agencyId) return json({ error: "NO_AGENCY" }, 403);

  // Body opcional: { only_unsynced: bool } default true. False = re-sync tudo.
  let body: { only_unsynced?: boolean } = {};
  try { body = await req.json(); } catch { /* OK, sem body */ }
  const onlyUnsynced = body.only_unsynced !== false;

  // Lê contatos da agência
  let query = admin.from("crm_contacts").select("id, external_ids").eq("agency_id", agencyId);
  if (onlyUnsynced) {
    // Postgres: external_ids->>'hubspot_contact_id' is null
    query = query.or("external_ids->>hubspot_contact_id.is.null,external_ids->>hubspot_contact_id.eq.");
  }
  const { data: contacts, error: cErr } = await query.limit(500);
  if (cErr) return json({ error: "QUERY_FAILED", message: cErr.message }, 500);

  const total = (contacts as Array<{ id: string }> | null)?.length ?? 0;
  if (total === 0) {
    return json({ total: 0, succeeded: 0, failed: 0, errors: [] });
  }

  // Processa um por um (sequencial pra não estourar rate limit do HubSpot)
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ contact_id: string; error: string }> = [];

  for (const c of contacts as Array<{ id: string }>) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/crm-hubspot-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Usa o JWT do user — crm-hubspot-push valida e busca a config da agência
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ contact_id: c.id }),
      });
      const r = await resp.json();
      if (resp.ok && r.ok) succeeded++;
      else {
        failed++;
        errors.push({ contact_id: c.id, error: r.message || r.error || `HTTP ${resp.status}` });
      }
    } catch (e: unknown) {
      failed++;
      errors.push({ contact_id: c.id, error: (e as Error).message });
    }
    // Pequeno delay pra ser amigável com o rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  return json({ total, succeeded, failed, errors: errors.slice(0, 20) });
});
