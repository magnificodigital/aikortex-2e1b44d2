import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AIKORTEX_RESEND_API_KEY = Deno.env.get('AIKORTEX_RESEND_API_KEY') ?? '';
const HMAC_SECRET = Deno.env.get('UNSUBSCRIBE_HMAC_SECRET') ?? '';
const PUBLIC_FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
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

async function signUnsubscribe(agentId: string, email: string): Promise<string> {
  if (!HMAC_SECRET) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = `${agentId}|${email.toLowerCase().trim()}`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildUnsubscribeUrl(agentId: string, email: string): Promise<string> {
  const sig = await signUnsubscribe(agentId, email);
  return `${PUBLIC_FUNCTIONS_BASE}/cadence-unsubscribe?agent=${encodeURIComponent(agentId)}&email=${encodeURIComponent(email)}&sig=${sig}`;
}

async function isUnsubscribed(agentId: string, email: string): Promise<boolean> {
  const { data } = await admin
    .from('cadence_unsubscribes')
    .select('id')
    .eq('agent_id', agentId)
    .ilike('contact_email', email.trim())
    .eq('channel', 'email')
    .maybeSingle();
  return !!data;
}

// Constrói "Name <email@x.com>" (RFC 5322) ou só "email" se nome vazio.
// Faz escaping mínimo de aspas no nome.
function buildFromHeader(email: string, name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return email;
  const safe = n.replace(/"/g, '\\"');
  return `"${safe}" <${email}>`;
}

function appendUnsubscribeFooter(body: string, unsubscribeUrl: string, fromName: string | null | undefined): string {
  const sender = (fromName ?? '').trim() || 'este remetente';
  const footer = [
    '',
    '',
    '— — —',
    `Você está recebendo este email porque consta em uma lista de contatos gerenciada por ${sender}.`,
    `Para parar de receber, clique aqui: ${unsubscribeUrl}`,
  ].join('\n');
  return `${body}${footer}`;
}

async function sendViaEmail(opts: {
  agencyId: string;
  agentId: string;
  to: string | null | undefined;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string; trial?: boolean; skipped?: 'unsubscribed' }> {
  if (!opts.to) return { ok: false, error: 'Contato sem email' };

  // Compliance: verificar opt-out ANTES de qualquer envio
  if (await isUnsubscribed(opts.agentId, opts.to)) {
    log('skipping unsubscribed contact', opts.to);
    return { ok: false, skipped: 'unsubscribed', error: 'RECIPIENT_UNSUBSCRIBED' };
  }

  const { data: secrets } = await admin
    .from('agency_secrets')
    .select('resend_api_key, resend_from_email, default_from_name, default_reply_to, agency_user_id')
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

  // Identidade do remetente: vem sempre de agency_secrets (BYOK) ou do default Aikortex (trial).
  // Nunca do step — step só carrega conteúdo (subject + message).
  let fromName: string | null = (secrets?.default_from_name ?? '').toString().trim() || null;
  let replyTo: string | null = (secrets?.default_reply_to ?? '').toString().trim() || null;

  if (secrets?.resend_api_key) {
    apiKey = secrets.resend_api_key;
    const from = (secrets.resend_from_email ?? '').trim();
    if (!from) {
      return {
        ok: false,
        error: 'MISSING_FROM_EMAIL: configure o campo "From" em Settings → Integrações → Email (precisa ser um endereço cujo domínio esteja verified na sua conta Resend)',
      };
    }
    fromEmail = from;
  } else if ((agency?.email_trial_used ?? 0) < TRIAL_LIMIT && AIKORTEX_RESEND_API_KEY) {
    apiKey = AIKORTEX_RESEND_API_KEY;
    fromEmail = 'cortesia@sendmail.aikortex.com';
    // Trial: identidade padrão Aikortex (sobrescreve qualquer default_from_name da agência,
    // pra deixar claro que é cortesia).
    fromName = 'Aikortex (cortesia)';
    replyTo = null;
    isTrial = true;
  } else if ((agency?.email_trial_used ?? 0) >= TRIAL_LIMIT) {
    return { ok: false, error: 'TRIAL_EXHAUSTED: configure sua chave Resend em Settings → Integrações → Email' };
  } else {
    return { ok: false, error: 'MISSING_CHANNEL_CONFIG: nenhuma chave Resend disponível (trial Aikortex não configurado)' };
  }

  const fromHeader = buildFromHeader(fromEmail, fromName);
  const unsubscribeUrl = await buildUnsubscribeUrl(opts.agentId, opts.to);
  const bodyWithFooter = appendUnsubscribeFooter(opts.body, unsubscribeUrl, fromName);

  const payload: Record<string, unknown> = {
    from: fromHeader,
    to: opts.to,
    subject: opts.subject,
    text: bodyWithFooter,
    // List-Unsubscribe header (RFC 8058) — clientes de email reconhecem e mostram
    // botão nativo "cancelar inscrição"; melhora reputation e reduz spam-flag.
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
  if (replyTo) {
    payload.reply_to = replyTo;
  }

  log('sending email', { to: opts.to, from: fromHeader, replyTo, isTrial });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
    const placeholders = {
      ...meta,
      nome: meta.nome || meta.name || execution.contact_name,
      name: meta.name || meta.nome || execution.contact_name,
    };
    const message = renderTemplate(currentStep.message_template ?? '', placeholders);

    // Subject: usa template do step se existir, com fallback pro nome da cadência + step #.
    const subjectTpl = (currentStep.subject_template ?? '').toString().trim();
    const subjectFallback = `${cadence.name} — Mensagem ${execution.current_step + 1}`;
    const subject = subjectTpl ? renderTemplate(subjectTpl, placeholders) : subjectFallback;

    let sendResult: { ok: boolean; error?: string; trial?: boolean; skipped?: 'unsubscribed' };
    try {
      switch (currentStep.channel) {
        case 'email':
          sendResult = await sendViaEmail({
            agencyId,
            agentId: execution.agent_id,
            to: meta.email || meta.Email || execution.contact_phone, // fallback
            subject,
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

    // Caso especial: contato descadastrou → cancela a execution inteira (não tenta steps seguintes).
    if (sendResult.skipped === 'unsubscribed') {
      await admin.from('cadence_executions').update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        last_error: 'recipient_unsubscribed',
      }).eq('id', executionId);
      return jsonOk(sendResult);
    }

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
