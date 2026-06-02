// Wrapper minimal pra REST API v3 do Composio. Usado pelas edge functions
// composio-connect/status/disconnect/execute.
//
// Composio hospeda OAuth pra ~250 providers. Pagamos por uso. Nosso código só
// precisa: (1) criar auth_config 1x por toolkit (cached), (2) iniciar connection
// pra (user, toolkit) → retorna redirectUrl, (3) checar status, (4) executar action.
//
// API key fica em Deno.env.get("COMPOSIO_API_KEY"). Header: x-api-key.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const COMPOSIO_BASE = "https://backend.composio.dev";

/** Slug interno (nosso, usado em user_api_keys.provider) → slug Composio. */
export const PROVIDER_TO_TOOLKIT: Record<string, string> = {
  google_calendar: "googlecalendar",
  google_sheets: "googlesheets",
  google_drive: "googledrive",
  gmail: "gmail",
  hubspot: "hubspot",
  calendly: "calendly",
  notion: "notion",
  slack: "slack",
  airtable: "airtable",
  asana: "asana",
  clickup: "clickup",
  discord: "discord",
  dropbox: "dropbox",
  github: "github",
  gitlab: "gitlab",
  linkedin: "linkedin",
  trello: "trello",
  zoom: "zoom",
};

export const TOOLKIT_TO_PROVIDER: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_TO_TOOLKIT).map(([k, v]) => [v, k]),
);

export function providerToToolkit(provider: string): string | null {
  return PROVIDER_TO_TOOLKIT[provider] ?? null;
}

export function toolkitToProvider(toolkit: string): string {
  return TOOLKIT_TO_PROVIDER[toolkit] ?? toolkit;
}

export type ComposioError = { error: string; status: number; details?: unknown };

async function composioFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiKey = Deno.env.get("COMPOSIO_API_KEY");
  if (!apiKey) throw new Error("COMPOSIO_API_KEY não configurada");

  const headers = new Headers(init.headers);
  headers.set("x-api-key", apiKey);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = init.method ?? "GET";
  console.log(`[composio] → ${method} ${path}`);
  const resp = await fetch(`${COMPOSIO_BASE}${path}`, { ...init, headers });
  const text = await resp.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* response não-JSON */ }

  console.log(`[composio] ← ${method} ${path} ${resp.status} body=${text.slice(0, 300)}`);

  if (!resp.ok) {
    const err = (json as { message?: string; error?: string } | null);
    throw new Error(
      `Composio ${method} ${path} → ${resp.status}: ${err?.message ?? err?.error ?? text.slice(0, 200)}`,
    );
  }

  return json as T;
}

/**
 * Pega auth_config_id do cache. Se não existe, cria via Composio
 * usando "use_composio_managed_auth" — Composio gerencia o OAuth app.
 * Resultado é salvo na tabela composio_auth_configs.
 */
export async function getOrCreateAuthConfig(
  admin: SupabaseClient,
  toolkitSlug: string,
): Promise<string> {
  const { data: cached } = await admin
    .from("composio_auth_configs")
    .select("auth_config_id")
    .eq("toolkit_slug", toolkitSlug)
    .maybeSingle();

  if (cached?.auth_config_id) return cached.auth_config_id;

  // Cria nova auth_config gerenciada pelo Composio
  const created = await composioFetch<{ auth_config: { id: string } }>(
    "/api/v3/auth_configs",
    {
      method: "POST",
      body: JSON.stringify({
        toolkit: { slug: toolkitSlug },
        auth_config: { type: "use_composio_managed_auth" },
      }),
    },
  );

  const authConfigId = created?.auth_config?.id;
  if (!authConfigId) {
    throw new Error(`Composio não retornou auth_config.id para ${toolkitSlug}`);
  }

  await admin.from("composio_auth_configs").upsert({
    toolkit_slug: toolkitSlug,
    auth_config_id: authConfigId,
    updated_at: new Date().toISOString(),
  });

  return authConfigId;
}

export type InitiateResult = {
  connectedAccountId: string;
  redirectUrl: string | null;
  status: string;
};

/** Inicia conexão pro user. Se OAuth, retorna redirectUrl pra abrir em popup. */
export async function initiateConnection(
  admin: SupabaseClient,
  userId: string,
  toolkitSlug: string,
): Promise<InitiateResult> {
  const authConfigId = await getOrCreateAuthConfig(admin, toolkitSlug);

  const resp = await composioFetch<{
    id: string;
    status: string;
    state?: { val?: { redirectUrl?: string } };
    redirect_url?: string;
  }>("/api/v3/connected_accounts", {
    method: "POST",
    body: JSON.stringify({
      toolkit: { slug: toolkitSlug },
      auth_config: { id: authConfigId },
      user_id: userId,
    }),
  });

  return {
    connectedAccountId: resp.id,
    redirectUrl: resp.state?.val?.redirectUrl ?? resp.redirect_url ?? null,
    status: resp.status,
  };
}

export type ConnectionStatus = {
  connected: boolean;
  connectedAccountId: string | null;
  status: string | null;
};

/** Verifica se user tem conexão ativa pro toolkit. */
export async function getConnectionStatus(
  userId: string,
  toolkitSlug: string,
): Promise<ConnectionStatus> {
  const params = new URLSearchParams();
  params.append("user_ids[]", userId);
  params.append("toolkit_slugs[]", toolkitSlug);
  params.append("limit", "5");

  const resp = await composioFetch<{
    items?: Array<{ id: string; status: string; toolkit?: { slug?: string } }>;
  }>(`/api/v3/connected_accounts?${params.toString()}`, { method: "GET" });

  const items = resp.items ?? [];
  // Procura o primeiro ACTIVE — pode haver INITIATED de tentativa anterior
  const active = items.find((it) => it.status === "ACTIVE");
  if (active) {
    return { connected: true, connectedAccountId: active.id, status: active.status };
  }
  const latest = items[0];
  return {
    connected: false,
    connectedAccountId: latest?.id ?? null,
    status: latest?.status ?? null,
  };
}

/** Remove conexão. */
export async function disconnectAccount(connectedAccountId: string): Promise<void> {
  await composioFetch(`/api/v3/connected_accounts/${connectedAccountId}`, {
    method: "DELETE",
  });
}

/** Executa uma tool. params depende da action. */
export async function executeAction(
  userId: string,
  toolSlug: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return await composioFetch("/api/v3/tools/execute", {
    method: "POST",
    body: JSON.stringify({
      tool_slug: toolSlug,
      user_id: userId,
      arguments: params,
    }),
  });
}

export function getAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}
