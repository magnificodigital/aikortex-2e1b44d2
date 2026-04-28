import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only platform users can list all users
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile || !["platform_owner", "platform_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all auth users (with email)
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      allUsers.push(...users);
      if (users.length < perPage) break;
      page++;
    }

    // Fetch all profiles
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    // Fetch all subscriptions with plan names
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, status, plan_id, billing_cycle, plans:plan_id(name)") as any;
    const subMap: Record<string, any> = {};
    (subs || []).forEach((s: any) => { subMap[s.user_id] = { status: s.status, plan: s.plans, billing_cycle: s.billing_cycle }; });

    // Merge data
    const merged = allUsers.map((u: any) => {
      const profile = profileMap[u.id];
      return {
        id: profile?.id || u.id,
        user_id: u.id,
        email: u.email,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        role: profile?.role || "agency_owner",
        tenant_type: profile?.tenant_type || "agency",
        is_active: profile?.is_active ?? true,
        created_at: profile?.created_at || u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        email_confirmed_at: u.email_confirmed_at || null,
        subscription: subMap[u.id] || null,
      };
    });

    return new Response(JSON.stringify({ users: merged }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
