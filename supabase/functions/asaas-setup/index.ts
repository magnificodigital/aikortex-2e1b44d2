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

  let body: { asaas_api_key?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const { asaas_api_key } = body
  if (!asaas_api_key || typeof asaas_api_key !== 'string') {
    return new Response(JSON.stringify({ error: 'asaas_api_key é obrigatório' }), { status: 400, headers: corsHeaders })
  }

  const asaasBase = Deno.env.get('ASAAS_ENV') === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

  // Validate key
  const walletRes = await fetch(`${asaasBase}/finance/getCurrentBalance`, {
    headers: { 'access_token': asaas_api_key }
  })

  if (!walletRes.ok) {
    return new Response(JSON.stringify({ error: 'Chave Asaas inválida' }), { status: 400, headers: corsHeaders })
  }

  // Get account info
  const accountRes = await fetch(`${asaasBase}/myAccount`, {
    headers: { 'access_token': asaas_api_key }
  })
  const accountData = await accountRes.json()

  // Save to agency_profiles
  const { error: upsertError } = await supabase
    .from('agency_profiles')
    .upsert({
      user_id: userId,
      asaas_api_key,
      asaas_wallet_id: accountData.walletId ?? accountData.id
    }, { onConflict: 'user_id' })

  if (upsertError) {
    return new Response(JSON.stringify({ error: 'Erro ao salvar configuração' }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({
    success: true,
    wallet_id: accountData.walletId,
    account_name: accountData.name
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
