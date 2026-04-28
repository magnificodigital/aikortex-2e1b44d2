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

  let body: { client_name?: string; client_email?: string; client_phone?: string; client_document?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const { client_name, client_email, client_phone, client_document } = body
  if (!client_name || typeof client_name !== 'string') {
    return new Response(JSON.stringify({ error: 'client_name é obrigatório' }), { status: 400, headers: corsHeaders })
  }

  const asaasBase = Deno.env.get('ASAAS_ENV') === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

  // Get agency profile
  const { data: agency } = await supabase
    .from('agency_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!agency?.asaas_api_key) {
    return new Response(JSON.stringify({
      error: 'Configure sua chave Asaas primeiro',
      action: 'configure_asaas'
    }), { status: 400, headers: corsHeaders })
  }

  // Create customer in agency's Asaas
  const customerRes = await fetch(`${asaasBase}/customers`, {
    method: 'POST',
    headers: {
      'access_token': agency.asaas_api_key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: client_name,
      email: client_email,
      phone: client_phone,
      cpfCnpj: client_document
    })
  })

  const customer = await customerRes.json()
  if (!customerRes.ok) {
    return new Response(JSON.stringify({ error: customer }), { status: 500, headers: corsHeaders })
  }

  // Create platform subscription with split
  const platformPrice = agency.platform_fee_monthly ?? 97
  const aikortexShare = 47

  const subscriptionRes = await fetch(`${asaasBase}/subscriptions`, {
    method: 'POST',
    headers: {
      'access_token': agency.asaas_api_key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer: customer.id,
      billingType: 'CREDIT_CARD',
      value: platformPrice,
      nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: 'Plataforma de Gestão - Mensal',
      split: [
        {
          walletId: PLATFORM_WALLET_ID,
          fixedValue: aikortexShare
        }
      ]
    })
  })

  const subscription = await subscriptionRes.json()

  // Save client to database
  const { data: newClient, error: insertError } = await supabase
    .from('agency_clients')
    .insert({
      agency_id: agency.id,
      client_name,
      client_email,
      client_phone,
      client_document,
      asaas_customer_id: customer.id,
      platform_subscription_id: subscription.id,
      platform_subscription_status: 'pending',
      status: 'active'
    })
    .select()
    .single()

  if (insertError) {
    return new Response(JSON.stringify({ error: 'Erro ao salvar cliente' }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({
    success: true,
    client: newClient,
    asaas_customer_id: customer.id,
    subscription_id: subscription.id
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
