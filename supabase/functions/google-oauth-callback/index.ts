// Callback do OAuth Google. Google redireciona pra cá com ?code=...&state=...
// Trocamos code por access_token + refresh_token, salvamos em user_api_keys,
// retornamos HTML que faz postMessage pro opener e fecha a popup.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

function base64UrlDecode(s: string): string {
  s = s.replaceAll("-", "+").replaceAll("_", "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function verifyState(state: string, secret: string): Promise<Record<string, unknown> | null> {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) return null;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );
    const json = base64UrlDecode(payloadB64);
    const sigBytes = Uint8Array.from(base64UrlDecode(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(json));
    if (!valid) return null;
    const payload = JSON.parse(json) as Record<string, unknown>;
    // Expira em 10 min
    const iat = Number(payload.iat ?? 0);
    if (!iat || Date.now() / 1000 - iat > 600) return null;
    return payload;
  } catch {
    return null;
  }
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function popupCloseHtml(message: { success: boolean; scope?: string; error?: string }, postOrigin: string): string {
  const payload = JSON.stringify(message);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${message.success ? "Conectado" : "Erro"}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px 20px; text-align: center; background: #0a0a0a; color: #fff; margin: 0; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
  p { color: #999; font-size: 14px; margin: 0 0 24px; }
  button { background: ${message.success ? "#10b981" : "#3b82f6"}; color: white; border: 0; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
  button:hover { opacity: 0.9; }
  .small { font-size: 11px; color: #666; margin-top: 16px; }
</style>
</head>
<body>
  <div class="icon">${message.success ? "✅" : "❌"}</div>
  <h1>${message.success ? "Conta conectada!" : "Erro na conexão"}</h1>
  <p>${message.success ? "Voltando ao chat..." : (message.error || "Tente novamente.")}</p>
  <button onclick="window.close()">Fechar janela</button>
  <p class="small">Se essa janela não fechar sozinha, clique no botão acima.</p>
  <script>
    (function() {
      var payload = ${payload};
      // Tenta avisar o opener via postMessage (caminho preferencial)
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, "${postOrigin}");
        }
      } catch (e) { console.error("postMessage falhou:", e); }
      // Também tenta BroadcastChannel (cross-tab dentro do mesmo origin)
      try {
        var bc = new BroadcastChannel("aikortex_oauth");
        bc.postMessage(payload);
        setTimeout(function() { try { bc.close(); } catch (e) {} }, 500);
      } catch (e) { /* BroadcastChannel não suportado */ }
      // Auto-close mais agressivo
      var closed = false;
      function tryClose() {
        if (closed) return;
        closed = true;
        try { window.close(); } catch (e) {}
      }
      setTimeout(tryClose, 800);
      setTimeout(tryClose, 2500);
    })();
  </script>
</body></html>`;
}

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const STATE_SECRET = Deno.env.get("OAUTH_STATE_SECRET") || SUPABASE_SERVICE_ROLE_KEY;
  // Origin "*" — frontend valida via shape do payload (data.success + data.scope).
  // Restringir aqui quebra quando o user testa em URLs diferentes (preview Lovable,
  // localhost, custom domain) e o ganho de segurança é marginal: postMessage não
  // entrega segredos, só o boolean success + scope, e o token real já está no DB.
  const POST_ORIGIN = "*";

  if (errorParam) {
    return htmlResponse(popupCloseHtml({ success: false, error: errorParam }, POST_ORIGIN));
  }
  if (!code || !state) {
    return htmlResponse(popupCloseHtml({ success: false, error: "missing code/state" }, POST_ORIGIN), 400);
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return htmlResponse(popupCloseHtml({ success: false, error: "OAuth client not configured" }, POST_ORIGIN), 500);
  }

  // Valida state (CSRF + extrai uid/scope)
  const payload = await verifyState(state, STATE_SECRET);
  if (!payload) {
    return htmlResponse(popupCloseHtml({ success: false, error: "invalid state" }, POST_ORIGIN), 400);
  }
  const userId = String(payload.uid || "");
  const scopeKey = String(payload.scope || "");

  if (!userId || !scopeKey) {
    return htmlResponse(popupCloseHtml({ success: false, error: "invalid payload" }, POST_ORIGIN), 400);
  }

  // Troca code por tokens
  const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokenJson = await tokenResp.json();
  if (!tokenResp.ok || !tokenJson.access_token) {
    console.error("[google-oauth] token exchange failed:", tokenJson);
    return htmlResponse(popupCloseHtml({ success: false, error: tokenJson.error || "token_exchange_failed" }, POST_ORIGIN), 500);
  }

  // Salva no user_api_keys — provider = scopeKey (google_calendar, etc.)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const tokenBlob = JSON.stringify({
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token || null,
    expires_at: Date.now() + (Number(tokenJson.expires_in || 3600) * 1000),
    scope: tokenJson.scope || "",
    token_type: tokenJson.token_type || "Bearer",
  });

  // Schema: api_key não-nulo = configured. Sem coluna `configured` separada.
  const { error: upErr } = await admin
    .from("user_api_keys")
    .upsert(
      { user_id: userId, provider: scopeKey, api_key: tokenBlob },
      { onConflict: "user_id,provider" },
    );

  if (upErr) {
    console.error("[google-oauth] DB upsert failed:", upErr);
    return htmlResponse(popupCloseHtml({ success: false, error: upErr.message }, POST_ORIGIN), 500);
  }

  console.log(`[google-oauth] ✓ ${scopeKey} connected for user ${userId}`);
  return htmlResponse(popupCloseHtml({ success: true, scope: scopeKey }, POST_ORIGIN));
});
