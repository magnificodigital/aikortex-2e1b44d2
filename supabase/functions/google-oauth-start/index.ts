// Inicia OAuth do Google (Calendar/Sheets/Drive/Gmail).
// Recebe agentId opcional, gera state CSRF-safe, retorna authUrl pro frontend abrir popup.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface StartBody {
  scope: "google_calendar" | "google_sheets" | "google_drive" | "gmail";
  agentId?: string;
}

const SCOPE_MAP: Record<string, string> = {
  google_calendar: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
  google_sheets: "https://www.googleapis.com/auth/spreadsheets",
  google_drive: "https://www.googleapis.com/auth/drive.file",
  gmail: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
};

function base64UrlEncode(s: string): string {
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signState(payload: Record<string, unknown>, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(json));
  const sigB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)));
  const payloadB64 = base64UrlEncode(json);
  return `${payloadB64}.${sigB64}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const STATE_SECRET = Deno.env.get("OAUTH_STATE_SECRET") || SUPABASE_SERVICE_ROLE_KEY;

  if (!GOOGLE_CLIENT_ID) {
    return new Response(JSON.stringify({
      error: "MISSING_CONFIG",
      message: "GOOGLE_OAUTH_CLIENT_ID não configurado. Crie um OAuth client no Google Cloud Console e configure como secret no Supabase.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Auth: obter user via JWT
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "INVALID_TOKEN" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: StartBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const scope = SCOPE_MAP[body.scope];
  if (!scope) {
    return new Response(JSON.stringify({ error: "INVALID_SCOPE", validScopes: Object.keys(SCOPE_MAP) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // State assinado: payload + HMAC-SHA256 pra CSRF protection
  const state = await signState({
    uid: userData.user.id,
    scope: body.scope,
    agentId: body.agentId ?? null,
    iat: Math.floor(Date.now() / 1000),
  }, STATE_SECRET);

  const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
    access_type: "offline",   // pra receber refresh_token
    prompt: "consent",          // força tela de consentimento (refresh_token vem mesmo se já autorizou antes)
    include_granted_scopes: "true",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Response(JSON.stringify({ authUrl }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
