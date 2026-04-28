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

  // ── Verify Asaas webhook signature ──────────────────────────────────────
  const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
  if (expectedToken) {
    const receivedToken = req.headers.get('asaas-access-token') ?? req.headers.get('Asaas-Access-Token')
    if (receivedToken !== expectedToken) {
      console.warn('asaas-webhook: invalid or missing access token')
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }
  } else {
    console.error('asaas-webhook: ASAAS_WEBHOOK_TOKEN not configured — rejecting all requests')
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 503, headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const event = body.event
  const payment = body.payment

  if (!event) {
    return new Response(JSON.stringify({ error: 'Missing event' }), { status: 400, headers: corsHeaders })
  }

  switch (event) {
    case 'PAYMENT_RECEIVED': {
      if (!payment?.subscription) break

      // Check template subscription
      const { data: sub } = await supabase
        .from('client_template_subscriptions')
        .select('*')
        .eq('asaas_subscription_id', payment.subscription)
        .single()

      if (sub) {
        await supabase.from('billing_events').insert({
          agency_id: sub.agency_id,
          client_id: sub.client_id,
          subscription_id: sub.id,
          event_type: 'payment_received',
          amount: payment.value,
          platform_amount: sub.platform_price_monthly,
          agency_amount: Number(sub.agency_price_monthly) - Number(sub.platform_price_monthly),
          asaas_payment_id: payment.id,
          description: `Pagamento recebido - ${payment.description ?? ''}`
        })

        await supabase
          .from('client_template_subscriptions')
          .update({ status: 'active', asaas_subscription_status: 'ACTIVE' })
          .eq('id', sub.id)
      }

      // Check platform subscription
      const { data: client } = await supabase
        .from('agency_clients')
        .select('*, agency_profiles(user_id)')
        .eq('platform_subscription_id', payment.subscription)
        .single()

      if (client) {
        await supabase
          .from('agency_clients')
          .update({ platform_subscription_status: 'active' })
          .eq('id', client.id)

        await supabase.from('billing_events').insert({
          agency_id: client.agency_id,
          client_id: client.id,
          event_type: 'payment_received',
          amount: payment.value,
          platform_amount: 47,
          agency_amount: Number(payment.value) - 47,
          asaas_payment_id: payment.id,
          description: 'Plataforma mensal'
        })

        // Notification: payment received
        const ownerUserId = (client as any).agency_profiles?.user_id
        if (ownerUserId) {
          await supabase.from('notifications').insert({
            user_id: ownerUserId,
            title: 'Pagamento recebido',
            message: `Pagamento de R$ ${payment.value} recebido de ${client.client_name}`,
            type: 'success',
            action_url: `/clients/${client.id}`
          })

          // Check tier upgrade
          const { data: agency } = await supabase
            .from('agency_profiles')
            .select('*')
            .eq('id', client.agency_id)
            .single()

          if (agency) {
            const previousTier = agency.tier
            // The trigger_update_agency_tier trigger handles tier update automatically
            // Re-read to check if tier changed
            const { data: updatedAgency } = await supabase
              .from('agency_profiles')
              .select('tier, active_clients_count')
              .eq('id', agency.id)
              .single()

            if (updatedAgency && updatedAgency.tier !== previousTier) {
              await supabase.from('notifications').insert({
                user_id: ownerUserId,
                title: `Você subiu para o tier ${updatedAgency.tier.toUpperCase()}!`,
                message: `Parabéns! Com ${updatedAgency.active_clients_count} clientes ativos você desbloqueou novos templates e benefícios.`,
                type: 'success',
                action_url: '/templates'
              })
            }
          }
        }
      }

      break
    }

    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_DELETED': {
      if (!payment?.subscription) break

      await supabase
        .from('client_template_subscriptions')
        .update({ status: 'suspended', asaas_subscription_status: 'OVERDUE' })
        .eq('asaas_subscription_id', payment.subscription)

      await supabase
        .from('agency_clients')
        .update({ platform_subscription_status: 'suspended' })
        .eq('platform_subscription_id', payment.subscription)

      // Notification: payment overdue
      const { data: overdueClient } = await supabase
        .from('agency_clients')
        .select('*, agency_profiles(user_id)')
        .eq('platform_subscription_id', payment.subscription)
        .single()

      if (overdueClient) {
        const ownerUserId = (overdueClient as any).agency_profiles?.user_id
        if (ownerUserId) {
          await supabase.from('notifications').insert({
            user_id: ownerUserId,
            title: 'Pagamento atrasado',
            message: `Pagamento atrasado de ${overdueClient.client_name} — regularize para evitar suspensão`,
            type: 'warning',
            action_url: `/clients/${overdueClient.id}`
          })
        }
      }

      break
    }

    case 'SUBSCRIPTION_DELETED': {
      const subscriptionId = body.subscription?.id
      if (subscriptionId) {
        await supabase
          .from('client_template_subscriptions')
          .update({ status: 'cancelled' })
          .eq('asaas_subscription_id', subscriptionId)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
