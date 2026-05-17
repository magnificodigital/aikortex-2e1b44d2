import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AIKORTEX_RESEND_API_KEY = Deno.env.get('AIKORTEX_RESEND_API_KEY') ?? '';
const TRIAL_LIMIT = 100;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function log(...args: unknown[]) {
  console.log('[send-cadence-step]', ...args);
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function renderTemplate(tpl: string, meta: Record<string, any> | null | undefined): string {
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (_, key) => (meta?.[key] ?? `{${key}}`));
}

function computeNextRunAt(startedAt: string, step: { day: number; hour: number; minute: number }): string {
  const base = new Date(startedAt).getTime();
  const delaySec = (step.day ?? 0) * 86400 + (step.hour ?? 0) * 3600 + (step.minute ?? 0) * 60;
  return new Date(base + delaySec * 1000).toISOString();
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

async function sendViaEmail(opts: {
  agencyId: string;
  to: string | null | undefined;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string; trial?: boolean }> {
  if (!opts.to) return { ok: false, error: 'Contato sem email' };

  const { data: secrets } = await admin
    .from('agency_secrets')
    .select('resend_api_key, resend_from_email, agency_user_id')
    .eq('agency_user_id', (
      await admin.from('agency_profiles').select('user_id').eq('id', opts.agencyId).maybeSingle()
    ).data?.user_id ?? '')
    .maybeSingle();

  const { data: agency } = await admin
    .from('agency_profiles')
    .select('email_trial_used')
    .eq('id', opts.agencyId)
    .maybeSingle();

  let apiKey = '';
  let fromEmail = '';
  let isTrial = false;

  if (secrets?.resend_api_key) {
    apiKey = secrets.resend_api_key;
    fromEmail = secrets.resend_from_email ?? 'no-reply@aikortex.com';
  } else if ((agency?.email_trial_used ?? 0) < TRIAL_LIMIT && AIKORTEX_RESEND_API_KEY) {
    apiKey = AIKORTEX_RESEND_API_KEY;
    fromEmail = 'onboarding@resend.dev';
    isTrial = true;
  } else if ((agency?.email_trial_used ?? 0) >= TRIAL_LIMIT) {
    return { ok: false, error: 'TRIAL_EXHAUSTED: configure sua chave Resend em Settings → Integrações → Email' };
  } else {
    return { ok: false, error: 'MISSING_CHANNEL_CONFIG: nenhuma chave Resend disponível (trial Aikortex não configurado)' };
  }

  log('sending email', { to: opts.to, from: fromEmail, isTrial });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    log('resend error', resp.status, errText);
    return { ok: false, error: `Resend ${resp.status}: ${errText.slice(0, 200)}` };
  }
  await resp.text();

  if (isTrial) {
    await admin.rpc('increment_email_trial', { p_agency_id: opts.agencyId });
  }
  // upsert emails_sent counter
  const ym = currentYearMonth();
  const { data: existing } = await admin
    .from('agency_monthly_usage')
    .select('emails_sent')
    .eq('agency_id', opts.agencyId)
    .eq('year_month', ym)
    .maybeSingle();
  if (existing) {
    await admin
      .from('agency_monthly_usage')
      .update({ emails_sent: (existing.emails_sent ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('agency_id', opts.agencyId)
      .eq('year_month', ym);
  } else {
    await admin.from('agency_monthly_usage').insert({
      agency_id: opts.agencyId,
      year_month: ym,
      message_count: 0,
      emails_sent: 1,
    });
  }

  return { ok: true, trial: isTrial };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const executionId = body.execution_id;
    if (!executionId) return jsonError(400, 'execution_id required');

    log('processing', executionId);

    const { data: execution, error: exErr } = await admin
      .from('cadence_executions')
      .select('*, cadence:agent_cadences(*), agent:user_agents(id, user_id)')
      .eq('id', executionId)
      .maybeSingle();

    if (exErr || !execution) return jsonError(404, 'execution not found');
    if (execution.status !== 'pending') {
      log('skip (not pending)', execution.status);
      return jsonOk({ skipped: true, status: execution.status });
    }

    const cadence: any = execution.cadence;
    if (!cadence || !cadence.enabled) {
      await admin.from('cadence_executions').update({
        status: 'cancelled', last_error: 'cadence disabled or missing',
      }).eq('id', executionId);
      return jsonOk({ cancelled: true });
    }

    const steps: any[] = Array.isArray(cadence.steps) ? cadence.steps : [];
    const currentStep = steps[execution.current_step];
    if (!currentStep) {
      await admin.from('cadence_executions').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', executionId);
      return jsonOk({ completed: true });
    }

    // resolve agency_id via agent.user_id -> agency_profiles
    const { data: agencyRow } = await admin
      .from('agency_profiles')
      .select('id')
      .eq('user_id', execution.agent?.user_id)
      .maybeSingle();
    const agencyId = agencyRow?.id;
    if (!agencyId) {
      await admin.from('cadence_executions').update({
        status: 'failed', last_error: 'agency_profile not found',
      }).eq('id', executionId);
      return jsonError(400, 'agency_profile not found');
    }

    // mark running (idempotência)
    await admin.from('cadence_executions').update({ status: 'running' }).eq('id', executionId);

    const meta = (execution.contact_metadata ?? {}) as Record<string, any>;
    const message = renderTemplate(currentStep.message_template ?? '', {
      ...meta,
      nome: meta.nome || meta.name || execution.contact_name,
      name: meta.name || meta.nome || execution.contact_name,
    });

    let sendResult: { ok: boolean; error?: string; trial?: boolean };
    try {
      switch (currentStep.channel) {
        case 'email':
          sendResult = await sendViaEmail({
            agencyId,
            to: meta.email || meta.Email || execution.contact_phone, // fallback
            subject: `${cadence.name} — Step ${execution.current_step + 1}`,
            body: message,
          });
          break;
        case 'whatsapp':
          sendResult = { ok: false, error: 'WhatsApp não disponível neste sprint (Sprint 2.7-c)' };
          break;
        case 'sms':
          sendResult = { ok: false, error: 'SMS não disponível neste sprint' };
          break;
        default:
          sendResult = { ok: false, error: `Canal não suportado: ${currentStep.channel}` };
      }
    } catch (e) {
      sendResult = { ok: false, error: (e as Error).message };
    }

    log('send result', sendResult);

    if (sendResult.ok) {
      const nextIdx = execution.current_step + 1;
      const nextStep = steps[nextIdx];
      if (nextStep) {
        await admin.from('cadence_executions').update({
          status: 'pending',
          current_step: nextIdx,
          next_run_at: computeNextRunAt(execution.started_at, nextStep),
          last_error: null,
        }).eq('id', executionId);
      } else {
        await admin.from('cadence_executions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_error: null,
        }).eq('id', executionId);
      }
    } else {
      await admin.from('cadence_executions').update({
        status: 'failed', last_error: sendResult.error ?? 'unknown',
      }).eq('id', executionId);
    }

    return jsonOk(sendResult);
  } catch (e) {
    log('fatal', e);
    return jsonError(500, (e as Error).message);
  }
});
