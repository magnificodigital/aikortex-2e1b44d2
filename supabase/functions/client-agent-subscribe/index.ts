// client-agent-subscribe
// =================
// Quando a agência publica um agente pra um cliente final, esta function:
//   1. Valida ownership (agência possui o agente)
//   2. Lê tier + asaas_wallet_id de agency_profiles
//   3. Cria customer no Asaas (master = Aikortex) com dados do cliente final
//   4. Cria Subscription mensal recorrente com SPLIT nativo:
//      - parte da Aikortex fica na conta master (não-walletId)
//      - parte da Agência redireciona pra agency.asaas_wallet_id
//   5. Persiste published_at + client_subscription_id + client_info no user_agents
//
// Master v7.4 §3.2 — % do split por tier:
//   start  → agência 40% / Aikortex 60%
//   hack   → agência 50% / Aikortex 50%
//   growth → agência 60% / Aikortex 40%
//
// Default retail price: R$ 997,00 (99700 cents). Pode ser sobrescrito por
// agent_templates.retail_price_cents quando o agente foi criado a partir
// de um template.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isProviderActive } from "../_shared/is-provider-active.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASAAS_BASE_DEFAULT = "https://api.asaas.com/v3";

async function loadAsaasConfig(admin: any) {
  // Cascade: platform_config > env. Admin gerencia via /admin?tab=api-keys.
  const { data } = await admin
    .from("platform_config")
    .select("key, value")
    .in("key", ["asaas_master_api_key", "asaas_api_base"]);
  const map = new Map<string, string>();
  (data ?? []).forEach((r: any) => map.set(r.key, r.value ?? ""));
  return {
    key: (map.get("asaas_master_api_key") || Deno.env.get("ASAAS_API_KEY") || "").trim(),
    base: (map.get("asaas_api_base") || Deno.env.get("ASAAS_API_BASE") || ASAAS_BASE_DEFAULT).trim(),
  };
}

const TIER_AGENCY_PERCENT: Record<string, number> = {
  start: 40,
  hack: 50,
  growth: 60,
};

interface ClientInfo {
  cpf_cnpj: string;
  name: string;
  email: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing_auth" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Provider active flag check (admin pode desligar em /admin?tab=api-keys)
    if (!(await isProviderActive(admin, "asaas"))) {
      return json({
        error: "provider_disabled",
        message: "Asaas (master) está desativado pelo admin. Publicações novas estão bloqueadas.",
      }, 503);
    }

    // Cascade: platform_config (admin UI) > env vars (fallback legacy)
    const asaasCfg = await loadAsaasConfig(admin);
    if (!asaasCfg.key) {
      return json({
        error: "asaas_not_configured",
        message: "Chave Asaas Master ausente. Admin precisa configurar em /admin → Chaves de API.",
      }, 500);
    }

    const body = await req.json() as { agent_id?: string; client_info?: ClientInfo };
    const agentId = body.agent_id;
    const client = body.client_info;
    if (!agentId) return json({ error: "missing_agent_id" }, 400);
    if (!client?.cpf_cnpj || !client?.name || !client?.email) {
      return json({ error: "missing_client_info", message: "client_info precisa de cpf_cnpj, name, email" }, 400);
    }

    // 1) Ownership do agente
    const { data: agent, error: agentErr } = await admin
      .from("user_agents")
      .select("id, user_id, name, template_id, published_at, client_subscription_id")
      .eq("id", agentId)
      .maybeSingle();
    if (agentErr || !agent) return json({ error: "agent_not_found" }, 404);
    if (agent.user_id !== userId) return json({ error: "forbidden", message: "Você não é dono deste agente" }, 403);
    if (agent.published_at && agent.client_subscription_id) {
      return json({
        error: "already_published",
        message: "Agente já está publicado. Cancele a assinatura antes de re-publicar.",
        subscription_id: agent.client_subscription_id,
      }, 409);
    }

    // 2) Agency profile (tier + wallet)
    const { data: profile } = await admin
      .from("agency_profiles")
      .select("tier, asaas_wallet_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return json({ error: "no_agency_profile", message: "Configure seu perfil de agência primeiro." }, 400);
    const tier = (profile.tier || "start").toLowerCase();
    const walletId = profile.asaas_wallet_id;
    if (!walletId) {
      return json({
        error: "no_wallet_id",
        message: "Sua wallet Asaas não está configurada. Acesse Configurações → Financeiro pra configurar.",
      }, 400);
    }

    const agencyPercent = TIER_AGENCY_PERCENT[tier];
    if (!agencyPercent) {
      return json({ error: "invalid_tier", message: `Tier '${tier}' não reconhecido.` }, 500);
    }

    // 3) Preço — template tem retail_price_cents OU default 99700 (R$ 997)
    let priceCents = 99700;
    if (agent.template_id) {
      const { data: tpl } = await admin
        .from("agent_templates")
        .select("retail_price_cents")
        .eq("id", agent.template_id)
        .maybeSingle();
      if (tpl?.retail_price_cents) priceCents = tpl.retail_price_cents;
    }
    const priceReal = priceCents / 100;

    // 4) Asaas: cria customer (idempotente via cpfCnpj — Asaas dedupe)
    const customerResp = await asaasReq(asaasCfg.key, asaasCfg.base, "POST", "/customers", {
      name: client.name,
      cpfCnpj: client.cpf_cnpj.replace(/\D/g, ""),
      email: client.email,
      mobilePhone: client.phone?.replace(/\D/g, "") || undefined,
      externalReference: `aikortex:agent:${agentId}`,
    });
    if (!customerResp.ok) {
      return json({
        error: "asaas_customer_failed",
        message: customerResp.error || "Asaas rejeitou os dados do cliente",
        details: customerResp.raw,
      }, 502);
    }
    const customerId = customerResp.data.id;

    // 5) Asaas: cria Subscription mensal com Split
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 7); // trial week
    const dueDateStr = nextDueDate.toISOString().slice(0, 10);

    const subResp = await asaasReq(asaasCfg.key, asaasCfg.base, "POST", "/subscriptions", {
      customer: customerId,
      billingType: "UNDEFINED", // cliente escolhe (Pix/boleto/cartão) no checkout
      value: priceReal,
      nextDueDate: dueDateStr,
      cycle: "MONTHLY",
      description: `Agente ${agent.name} — Aikortex`,
      externalReference: `aikortex:agent:${agentId}`,
      split: [{ walletId, percentualValue: agencyPercent }],
    });
    if (!subResp.ok) {
      return json({
        error: "asaas_subscription_failed",
        message: subResp.error || "Asaas rejeitou a criação da assinatura",
        details: subResp.raw,
      }, 502);
    }
    const subId = subResp.data.id;

    // 6) Persiste no user_agents
    const { error: updErr } = await admin
      .from("user_agents")
      .update({
        published_at: new Date().toISOString(),
        client_subscription_id: subId,
        client_info: client,
        subscription_status: "pending",
      })
      .eq("id", agentId);
    if (updErr) {
      console.error("[client-agent-subscribe] update user_agents falhou:", updErr);
      // Não falha o request — Asaas já criou a sub. Devolvemos sucesso e cron
      // reconcilia. Sub_id está no externalReference pra recovery manual se preciso.
    }

    return json({
      ok: true,
      subscription_id: subId,
      customer_id: customerId,
      next_due_date: dueDateStr,
      tier,
      agency_percent: agencyPercent,
      platform_percent: 100 - agencyPercent,
      retail_price_cents: priceCents,
    });
  } catch (e) {
    console.error("[client-agent-subscribe] exception:", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

async function asaasReq(apiKey: string, baseUrl: string, method: "POST" | "GET", path: string, body?: unknown) {
  const resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "access_token": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await resp.text();
  let parsed: any = null;
  try { parsed = JSON.parse(raw); } catch { /* */ }
  if (!resp.ok) {
    const errMsg = parsed?.errors?.[0]?.description
      || parsed?.message
      || `HTTP ${resp.status}`;
    return { ok: false, error: errMsg, raw, status: resp.status };
  }
  return { ok: true, data: parsed, raw };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
