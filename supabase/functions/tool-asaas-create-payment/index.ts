// tool-asaas-create-payment
// =========================
// Tool que o AGENTE chama durante a conversa pra gerar uma cobrança via
// Asaas DO CLIENTE FINAL (não a Asaas master da Aikortex).
//
// Cenário: agente SDR de uma loja conversa com consumidor no WhatsApp,
// fecha venda de R$ 250. Agente chama essa tool, que cria customer + payment
// na conta Asaas DA LOJA (configurada em Conectores > Asaas com api_key),
// e retorna o invoiceUrl (link de pagamento) pro consumidor.
//
// Aikortex e agência NÃO tocam nesse dinheiro — vai direto pra conta Asaas
// do cliente. Aikortex/agência só são pagas via Asaas Subscription separada
// (client-agent-subscribe), pelo agente publicado.
//
// Auth: service_role (chamada interna pelo agent-tools dispatcher).
// Acesso à api_key do user feita via user_api_keys com agentOwnerId.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASAAS_BASE = Deno.env.get("ASAAS_API_BASE") || "https://api.asaas.com/v3";

interface ToolInput {
  agent_id: string;
  value_cents: number;
  description: string;
  customer_name: string;
  customer_email?: string;
  customer_cpf_cnpj: string;
  customer_phone?: string;
  due_date?: string; // YYYY-MM-DD; default = hoje + 3 dias
  billing_type?: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED"; // UNDEFINED deixa cliente escolher
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const callerToken = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = callerToken === SERVICE_ROLE;
    if (!isServiceRole) {
      // Chamada externa direta tambem aceita (pra testar), mas valida o JWT
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${callerToken}` } } },
      );
      const { data: userData } = await supa.auth.getUser();
      if (!userData?.user) return json({ error: "unauthorized" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      SERVICE_ROLE,
    );

    const input = await req.json() as ToolInput;
    if (!input.agent_id) return json({ error: "missing_agent_id" }, 400);
    if (!input.value_cents || input.value_cents < 100) {
      return json({ error: "invalid_value", message: "value_cents precisa ser >= 100 (R$ 1,00)" }, 400);
    }
    if (!input.customer_name || !input.customer_cpf_cnpj) {
      return json({ error: "missing_customer", message: "customer_name e customer_cpf_cnpj obrigatorios" }, 400);
    }

    // 1) Acha o dono do agente
    const { data: agent, error: agErr } = await admin
      .from("user_agents")
      .select("id, user_id, name")
      .eq("id", input.agent_id)
      .maybeSingle();
    if (agErr || !agent) return json({ error: "agent_not_found" }, 404);

    // 2) Pega a chave Asaas do CLIENTE (configurada no agente via Conectores)
    const { data: keyRow } = await admin
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", agent.user_id)
      .eq("provider", "asaas")
      .maybeSingle();

    const asaasKey = keyRow?.api_key?.trim();
    if (!asaasKey) {
      return json({
        error: "asaas_not_configured",
        message: "Conecte sua chave Asaas em Conectores pra o agente poder gerar cobranças.",
      }, 400);
    }

    // 3) Cria customer no Asaas do CLIENTE (idempotente via cpfCnpj)
    const cpfCnpj = input.customer_cpf_cnpj.replace(/\D/g, "");
    const custResp = await asaasReq(asaasKey, "POST", "/customers", {
      name: input.customer_name,
      cpfCnpj,
      email: input.customer_email,
      mobilePhone: input.customer_phone?.replace(/\D/g, ""),
    });
    if (!custResp.ok) {
      return json({
        error: "asaas_customer_failed",
        message: custResp.error || "Asaas rejeitou os dados do cliente final",
        details: custResp.raw,
      }, 502);
    }
    const customerId = custResp.data.id;

    // 4) Cria payment one-off
    const dueDate = input.due_date || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().slice(0, 10);
    })();

    const valueReal = input.value_cents / 100;
    const payResp = await asaasReq(asaasKey, "POST", "/payments", {
      customer: customerId,
      billingType: input.billing_type || "UNDEFINED",
      value: valueReal,
      dueDate,
      description: input.description || `Cobrança via ${agent.name}`,
      externalReference: `aikortex:agent_tool:${input.agent_id}`,
    });
    if (!payResp.ok) {
      return json({
        error: "asaas_payment_failed",
        message: payResp.error || "Asaas rejeitou a cobrança",
        details: payResp.raw,
      }, 502);
    }

    const payment = payResp.data;
    return json({
      ok: true,
      payment_id: payment.id,
      invoice_url: payment.invoiceUrl, // link pro cliente pagar
      due_date: payment.dueDate,
      value: payment.value,
      net_value: payment.netValue,
      status: payment.status,
    });
  } catch (e) {
    console.error("[tool-asaas-create-payment] exception:", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

async function asaasReq(apiKey: string, method: "POST" | "GET", path: string, body?: unknown) {
  const resp = await fetch(`${ASAAS_BASE}${path}`, {
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
