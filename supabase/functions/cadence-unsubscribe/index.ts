// Endpoint público (verify_jwt=false) que processa o clique no link
// "descadastrar" enviado em emails de cadência.
//
// URL esperada: GET /functions/v1/cadence-unsubscribe?agent=<uuid>&email=<urlencoded>&sig=<hex>
//
// Verificação: sig = HMAC-SHA256(UNSUBSCRIBE_HMAC_SECRET, agent + '|' + lower(email))
// Se válida, insere em cadence_unsubscribes (idempotente via UNIQUE index)
// e renderiza uma página HTML simples confirmando o opt-out.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HMAC_SECRET = Deno.env.get('UNSUBSCRIBE_HMAC_SECRET') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function log(...args: unknown[]) {
  console.log('[cadence-unsubscribe]', ...args);
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function htmlPage(title: string, message: string, ok: boolean): Response {
  const color = ok ? '#10b981' : '#ef4444';
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f9fafb; color: #111827; margin: 0; padding: 40px 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 40px; max-width: 480px; width: 100%; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: ${color}1A; color: ${color}; font-size: 32px; line-height: 56px; margin: 0 auto 20px; }
    h1 { font-size: 22px; margin: 0 0 12px; font-weight: 600; }
    p { font-size: 15px; color: #4b5563; margin: 0 0 8px; line-height: 1.5; }
    .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${ok ? '✓' : '✗'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="footer">Aikortex</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!HMAC_SECRET) {
    log('missing UNSUBSCRIBE_HMAC_SECRET env');
    return htmlPage(
      'Configuração ausente',
      'O sistema de descadastramento não está configurado. Contate o suporte.',
      false,
    );
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent') ?? '';
    const email = (url.searchParams.get('email') ?? '').toLowerCase().trim();
    const sig = (url.searchParams.get('sig') ?? '').toLowerCase().trim();

    if (!agentId || !email || !sig) {
      return htmlPage(
        'Link inválido',
        'O link de descadastramento está incompleto ou foi modificado.',
        false,
      );
    }

    const expected = await signPayload(`${agentId}|${email}`);
    if (!constantTimeEq(expected, sig)) {
      log('invalid signature for', agentId, email);
      return htmlPage(
        'Link inválido',
        'Não foi possível validar este link. Ele pode ter sido modificado ou estar expirado.',
        false,
      );
    }

    // Insert (idempotent via unique index)
    const { error } = await admin.from('cadence_unsubscribes').insert({
      agent_id: agentId,
      contact_email: email,
      channel: 'email',
      reason: 'user_clicked_link',
    });

    // Ignorar erro de unique constraint (já estava descadastrado)
    if (error && !error.message?.includes('duplicate') && !error.message?.includes('unique')) {
      log('insert error', error);
      return htmlPage(
        'Erro ao processar',
        'Tivemos um problema técnico. Tente novamente em alguns minutos.',
        false,
      );
    }

    return htmlPage(
      'Descadastrado com sucesso',
      `O email <strong>${email}</strong> não receberá mais mensagens desta cadência.`,
      true,
    );
  } catch (e) {
    log('error', e);
    return htmlPage('Erro inesperado', (e as Error).message, false);
  }
});
