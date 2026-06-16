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

/** Detecta se o body tem tags HTML — qualquer tag conta como sinal de rich content. */
function isHtmlBody(body: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(body);
}

/** Converte HTML em texto plano pra usar como fallback no payload multipart do Resend.
 *  Preserva quebras de linha em tags de bloco e decodifica entities básicas. */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Append do footer de unsubscribe em HTML — mantém formatação consistente com Resend. */
function appendUnsubscribeFooterHtml(html: string, unsubscribeUrl: string, fromName: string | null | undefined): string {
  const sender = (fromName ?? '').trim() || 'este remetente';
  const footer = `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
    <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0;font-family:Helvetica,Arial,sans-serif">
      Você está recebendo este email porque consta em uma lista de contatos gerenciada por ${sender}.<br />
      <a href="${unsubscribeUrl}" style="color:#2563eb;text-decoration:underline">Cancelar inscrição</a>
    </p>
  `;
  return `${html}${footer}`;
}

const WHATSAPP_GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Envia uma mensagem template via WhatsApp Cloud API.
 * Sempre usa formato "template" porque mensagens free-form só funcionam dentro
 * da janela de 24h da última msg do contato — pra cadências (que disparam frio),
 * template aprovado é único caminho confiável.
 */
async function sendViaWhatsApp(opts: {
  agentId: string;
  agentUserId: string;
  to: string | null | undefined;
  templateName: string;
  templateLanguage: string;
  templateVariables: string[];
  fallbackBody: string;
}): Promise<{ ok: boolean; error?: string; wamid?: string }> {
  if (!opts.to) return { ok: false, error: 'Contato sem telefone' };
  if (!opts.templateName) {
    return { ok: false, error: 'MISSING_TEMPLATE_NAME: configure um template aprovado da Meta para este step' };
  }

  const { data: keys } = await admin
    .from('user_api_keys')
    .select('provider, api_key')
    .eq('user_id', opts.agentUserId)
    .in('provider', ['whatsapp_access_token', 'whatsapp_phone_number_id']);

  const keyMap: Record<string, string> = {};
  (keys ?? []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });

  const accessToken = keyMap.whatsapp_access_token;
  const phoneNumberId = keyMap.whatsapp_phone_number_id;
  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'MISSING_WABA_CONFIG: conecte sua conta WhatsApp em Integrações → WhatsApp' };
  }

  const components = opts.templateVariables.length > 0 ? [{
    type: 'body',
    parameters: opts.templateVariables.map((v) => ({ type: 'text', text: v })),
  }] : undefined;

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: opts.to,
    type: 'template',
    template: {
      name: opts.templateName,
      language: { code: opts.templateLanguage || 'pt_BR' },
      ...(components ? { components } : {}),
    },
  };

  log('sending whatsapp', { to: opts.to, template: opts.templateName });

  const resp = await fetch(`${WHATSAPP_GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const respText = await resp.text();
  if (!resp.ok) {
    log('whatsapp error', resp.status, respText);
    return { ok: false, error: `WhatsApp ${resp.status}: ${respText.slice(0, 250)}` };
  }

  let wamid: string | undefined;
  try {
    const data = JSON.parse(respText);
    wamid = data?.messages?.[0]?.id;
  } catch { /* ignore */ }

  // Registra mensagem outgoing no histórico de WhatsApp (mesma tabela usada
  // pelo whatsapp-send manual + auto-reply do agente)
  try {
    await admin.from('whatsapp_messages').insert({
      wamid: wamid ?? null,
      from_number: phoneNumberId,
      phone_number_id: phoneNumberId,
      to_number: opts.to,
      message_type: 'template',
      content: opts.fallbackBody || opts.templateName,
      raw_payload: payload,
      direction: 'outgoing',
      status: 'sent',
      user_id: opts.agentUserId,
    });
  } catch (e) {
    log('whatsapp_messages insert error (ignored)', (e as Error).message);
  }

  return { ok: true, wamid };
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

  // Detecta se o body é HTML (vem de Email Template via Tiptap). Se for, manda
  // multipart com html + text fallback; senão, só text. Footer de unsubscribe é
  // adicionado no formato correspondente.
  const isHtml = isHtmlBody(opts.body);
  const htmlBody = isHtml ? appendUnsubscribeFooterHtml(opts.body, unsubscribeUrl, fromName) : null;
  const textBody = isHtml
    ? appendUnsubscribeFooter(htmlToPlainText(opts.body), unsubscribeUrl, fromName)
    : appendUnsubscribeFooter(opts.body, unsubscribeUrl, fromName);

  const payload: Record<string, unknown> = {
    from: fromHeader,
    to: opts.to,
    subject: opts.subject,
    text: textBody,
    // List-Unsubscribe header (RFC 8058) — clientes de email reconhecem e mostram
    // botão nativo "cancelar inscrição"; melhora reputation e reduz spam-flag.
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
  if (htmlBody) {
    payload.html = htmlBody;
  }
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

  // Auth: somente service role (chamado interno por cron/scheduler).
  // Antes era totalmente aberto — qualquer um com execution_id válido podia
  // disparar emails/WhatsApp e consumir cota do usuário.
  const authHeader = req.headers.get('Authorization') || '';
  const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (callerToken !== SERVICE_ROLE) {
    return jsonError(401, 'Unauthorized');
  }

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

    let sendResult: { ok: boolean; error?: string; trial?: boolean; skipped?: 'unsubscribed'; wamid?: string };
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
        case 'whatsapp': {
          const rawVars = Array.isArray(currentStep.whatsapp_template_variables)
            ? currentStep.whatsapp_template_variables
            : [];
          const renderedVars = rawVars.map((v: any) => renderTemplate(String(v ?? ''), placeholders));
          sendResult = await sendViaWhatsApp({
            agentId: execution.agent_id,
            agentUserId: execution.agent?.user_id ?? '',
            to: meta.telefone || meta.phone || meta.whatsapp || execution.contact_phone,
            templateName: (currentStep.whatsapp_template_name ?? '').toString().trim(),
            templateLanguage: (currentStep.whatsapp_template_language ?? 'pt_BR').toString(),
            templateVariables: renderedVars,
            fallbackBody: message,
          });
          break;
        }
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
      // Anota o wamid do último envio (se WhatsApp) pra correlacionar
      // statuses sent/delivered/read recebidos via webhook.
      const updatedMeta = sendResult.wamid
        ? { ...(execution.metadata ?? {}), last_wamid: sendResult.wamid, last_channel: currentStep.channel }
        : execution.metadata;

      const nextIdx = execution.current_step + 1;
      const nextStep = steps[nextIdx];
      if (nextStep) {
        await admin.from('cadence_executions').update({
          status: 'pending',
          current_step: nextIdx,
          next_run_at: computeNextRunAt(execution.started_at, nextStep),
          last_error: null,
          metadata: updatedMeta,
        }).eq('id', executionId);
      } else {
        await admin.from('cadence_executions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_error: null,
          metadata: updatedMeta,
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
