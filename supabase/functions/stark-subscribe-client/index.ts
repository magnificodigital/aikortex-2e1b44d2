// stark-subscribe-client
// ======================
// Agencia vende o Stark pro cliente final. Espelha asaas-subscribe-template:
// - preco base vem de platform_config.stark_resale (admin define)
// - agencia escolhe o preco de venda (>= base)
// - assinatura Asaas com split fixedValue = base (Aikortex), resto da agencia
// - grava client_stark_subscriptions + habilita modulo stark.copilot no cliente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const PLATFORM_WALLET_ID = Deno.env.get('AIKORTEX_ASAAS_WALLET_ID')!
const STARK_MODULE_KEY = 'stark.copilot'
const DEFAULT_BASE_PRICE = 97

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  let body: { client_id?: string; agency_price_monthly?: number }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { client_id, agency_price_monthly } = body
  if (!client_id || typeof agency_price_monthly !== 'number') {
    return json({ error: 'client_id e agency_price_monthly são obrigatórios' }, 400)
  }

  // Agencia + secret Asaas
  const { data: agency } = await supabase
    .from('agency_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (!agency) return json({ error: 'Perfil de agência não encontrado' }, 404)

  const { data: secret } = await supabase
    .from('agency_secrets')
    .select('asaas_api_key')
    .eq('agency_user_id', user.id)
    .maybeSingle()
  const asaasApiKey = secret?.asaas_api_key

  // Cliente (da agencia)
  const { data: client } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('id', client_id)
    .eq('agency_id', agency.id)
    .single()
  if (!client) return json({ error: 'Cliente não encontrado' }, 404)

  // Ja tem Stark?
  const { data: existing } = await supabase
    .from('client_stark_subscriptions')
    .select('id, status')
    .eq('client_id', client_id)
    .maybeSingle()
  if (existing && existing.status !== 'canceled') {
    return json({ error: 'Este cliente já tem Stark ativo' }, 409)
  }

  // Preco base do admin (platform_config.stark_resale)
  let basePrice = DEFAULT_BASE_PRICE
  const { data: cfg } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', 'stark_resale')
    .maybeSingle()
  try {
    const parsed = JSON.parse(cfg?.value || '{}')
    if (typeof parsed.base_price_monthly === 'number' && parsed.base_price_monthly > 0) {
      basePrice = parsed.base_price_monthly
    }
  } catch { /* usa default */ }

  if (agency_price_monthly < basePrice) {
    return json({
      error: `Preço mínimo é R$ ${basePrice.toFixed(2)} (base da plataforma)`,
      base_price_monthly: basePrice,
    }, 400)
  }

  const asaasBase = Deno.env.get('ASAAS_ENV') === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

  // Assinatura Asaas (modo MANUAL quando agencia nao configurou Asaas)
  let asaasSubscriptionId: string | null = null
  let asaasSubscriptionStatus = 'MANUAL'

  if (asaasApiKey && client.asaas_customer_id) {
    const subscriptionRes = await fetch(`${asaasBase}/subscriptions`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: client.asaas_customer_id,
        billingType: 'CREDIT_CARD',
        value: agency_price_monthly,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: 'Stark — copiloto de IA',
        split: [{ walletId: PLATFORM_WALLET_ID, fixedValue: basePrice }],
      }),
    })
    const subscription = await subscriptionRes.json()
    if (!subscriptionRes.ok) return json({ error: subscription }, 500)
    asaasSubscriptionId = subscription.id
    asaasSubscriptionStatus = 'ACTIVE'
  }

  // Grava assinatura (upsert cobre re-venda apos cancelamento)
  const { data: starkSub, error: insertError } = await supabase
    .from('client_stark_subscriptions')
    .upsert({
      client_id,
      agency_id: agency.id,
      agency_price_monthly,
      platform_price_monthly: basePrice,
      status: 'trial',
      trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      asaas_subscription_id: asaasSubscriptionId,
      asaas_subscription_status: asaasSubscriptionStatus,
      activated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
    .select()
    .single()
  if (insertError) {
    console.error('[stark-subscribe-client] insert:', insertError)
    return json({ error: 'Erro ao salvar assinatura' }, 500)
  }

  // Habilita o modulo Stark no workspace do cliente
  const modules = new Set<string>((client.enabled_modules as string[]) ?? [])
  modules.add(STARK_MODULE_KEY)
  await supabase
    .from('agency_clients')
    .update({ enabled_modules: Array.from(modules) })
    .eq('id', client_id)

  return json({
    success: true,
    subscription: starkSub,
    message: asaasSubscriptionId
      ? 'Stark vendido — assinatura Asaas criada e módulo habilitado no workspace.'
      : 'Stark habilitado em modo manual (configure o Asaas pra cobrar automaticamente).',
  })
})
