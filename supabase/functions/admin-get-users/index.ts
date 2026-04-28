import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (
      !profile ||
      !["platform_owner", "platform_admin"].includes(profile.role)
    ) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all auth users
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) break;
      allUsers.push(...users);
      if (users.length < perPage) break;
      page++;
    }

    // Get all profiles with agency info
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    const { data: agencyProfiles } = await supabase
      .from("agency_profiles")
      .select("*");

    // Get subscriptions with plans
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*, plans(name)")
      .in("status", ["active", "trialing", "past_due", "paused"]);

    // Get agency clients for client users
    const { data: agencyClients } = await supabase
      .from("agency_clients")
      .select("id, client_name, client_user_id, agency_id");

    const combined = (allUsers || []).map((u) => {
      const prof = profiles?.find((p) => p.user_id === u.id);
      const agency = agencyProfiles?.find((a) => a.user_id === u.id);
      const sub = subscriptions?.find((s) => s.user_id === u.id);
      const clientRecord = agencyClients?.find((c) => c.client_user_id === u.id);
      const clientAgency = clientRecord ? agencyProfiles?.find((a) => a.id === clientRecord.agency_id) : null;

      return {
        id: prof?.id || u.id,
        user_id: u.id,
        email: u.email,
        full_name: prof?.full_name || null,
        avatar_url: prof?.avatar_url || null,
        role: prof?.role || "agency_owner",
        tenant_type: prof?.tenant_type || "agency",
        is_active: prof?.is_active ?? true,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        subscription: sub
          ? {
              status: sub.status,
              plan: sub.plans ? { name: (sub.plans as any).name } : null,
              billing_cycle: sub.billing_cycle,
            }
          : null,
        agency: agency
          ? {
              id: agency.id,
              agency_name: agency.agency_name,
              tier: agency.tier,
              active_clients_count: agency.active_clients_count,
            }
          : null,
        client: clientRecord
          ? {
              id: clientRecord.id,
              client_name: clientRecord.client_name,
              agency_id: clientRecord.agency_id,
              agency_name: clientAgency?.agency_name || null,
            }
          : null,
      };
    });

    return new Response(JSON.stringify({ users: combined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
