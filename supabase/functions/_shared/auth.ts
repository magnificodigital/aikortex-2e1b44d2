import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthContext = {
  user: { id: string; email?: string };
  profile: {
    id: string;
    user_id: string;
    role: string;
    tenant_type: string;
    full_name: string | null;
    is_active: boolean;
  };
  agencyId: string | null;
  supabase: SupabaseClient;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Valida JWT, carrega profile, retorna contexto autenticado.
 * Retorna Response (401/403) em caso de falha — chamador apenas faz `return` se receber Response.
 */
export async function getAuthContext(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, user_id, role, tenant_type, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: "Profile não encontrado para o usuário autenticado" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (profile.is_active === false) {
    return new Response(
      JSON.stringify({ error: "Conta desativada" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Resolve agency_id quando aplicável (tenant_type=agency).
  let agencyId: string | null = null;
  if (profile.tenant_type === "agency") {
    const { data: agency } = await supabase
      .from("agency_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    agencyId = (agency as { id?: string } | null)?.id ?? null;
  }

  return {
    user: { id: user.id, email: user.email },
    profile,
    agencyId,
    supabase,
  };
}

/** Helper para checar se o contexto autoriza um conjunto de roles. */
export function requireRole(ctx: AuthContext, roles: string[]): Response | null {
  if (!roles.includes(ctx.profile.role)) {
    return new Response(
      JSON.stringify({ error: "Acesso negado para este role" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

/** Helper para responder OPTIONS (CORS preflight). */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
