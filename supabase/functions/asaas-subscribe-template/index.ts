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

const tierOrder: Record<string, number> = { starter: 0, explorer: 1, hack: 2 }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }
  const userId = user.id

  let body: { client_id?: string; template_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const { client_id, template_id } = body
  if (!client_id || !template_id) {
    return new Response(JSON.stringify({ error: 'client_id e template_id são obrigatórios' }), { status: 400, headers: corsHeaders })
  }

  const asaasBase = Deno.env.get('ASAAS_ENV') === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

  // Get agency
  const { data: agency } = await supabase
    .from('agency_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!agency?.asaas_api_key) {
    return new Response(JSON.stringify({ error: 'Asaas não configurado' }), { status: 400, headers: corsHeaders })
  }

  // Get client
  const { data: client } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('id', client_id)
    .eq('agency_id', agency.id)
    .single()

  if (!client) {
    return new Response(JSON.stringify({ error: 'Cliente não encontrado' }), { status: 404, headers: corsHeaders })
  }

  // Get template
  const { data: template } = await supabase
    .from('platform_templates')
    .select('*')
    .eq('id', template_id)
    .single()

  if (!template) {
    return new Response(JSON.stringify({ error: 'Template não encontrado' }), { status: 404, headers: corsHeaders })
  }

  // Check tier
  if ((tierOrder[agency.tier] ?? 0) < (tierOrder[template.min_tier] ?? 0)) {
    return new Response(JSON.stringify({
      error: `Este template requer o tier ${template.min_tier}`,
      action: 'upgrade_tier'
    }), { status: 403, headers: corsHeaders })
  }

  // Pricing
  const customPricing = agency.custom_pricing as Record<string, number> | null
  const agencyPrice = customPricing?.[template.slug] ?? Number(template.platform_price_monthly) * 2
  const platformPrice = Number(template.platform_price_monthly)

  // Create subscription in Asaas with split
  const subscriptionRes = await fetch(`${asaasBase}/subscriptions`, {
    method: 'POST',
    headers: {
      'access_token': agency.asaas_api_key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer: client.asaas_customer_id,
      billingType: 'CREDIT_CARD',
      value: agencyPrice,
      nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: `Template: ${template.name}`,
      split: [
        {
          walletId: PLATFORM_WALLET_ID,
          fixedValue: platformPrice
        }
      ]
    })
  })

  const subscription = await subscriptionRes.json()
  if (!subscriptionRes.ok) {
    return new Response(JSON.stringify({ error: subscription }), { status: 500, headers: corsHeaders })
  }

  // Save subscription
  const { data: templateSub, error: insertError } = await supabase
    .from('client_template_subscriptions')
    .insert({
      client_id,
      template_id,
      agency_id: agency.id,
      agency_price_monthly: agencyPrice,
      platform_price_monthly: platformPrice,
      status: 'trial',
      trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      asaas_subscription_id: subscription.id,
      asaas_subscription_status: 'ACTIVE',
      is_activated: false
    })
    .select()
    .single()

  if (insertError) {
    return new Response(JSON.stringify({ error: 'Erro ao salvar assinatura' }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({
    success: true,
    subscription: templateSub,
    message: 'Template disponível para teste. Ative em um canal para colocar em produção.'
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
