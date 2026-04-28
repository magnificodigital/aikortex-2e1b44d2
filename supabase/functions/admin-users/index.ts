import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!callerProfile || !["platform_owner", "platform_admin"].includes(callerProfile.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      /* ─── LIST ─── */
      case "list": {
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

        const [{ data: profiles }, { data: agencyProfiles }, { data: subscriptions }, { data: agencyClients }] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("agency_profiles").select("*"),
          supabase.from("subscriptions").select("*, plans(name)").in("status", ["active", "trialing", "past_due", "paused"]),
          supabase.from("agency_clients").select("id, client_name, client_user_id, agency_id"),
        ]);

        const combined = allUsers.map((u) => {
          const prof = profiles?.find((p: any) => p.user_id === u.id);
          const agency = agencyProfiles?.find((a: any) => a.user_id === u.id);
          const sub = subscriptions?.find((s: any) => s.user_id === u.id);
          const clientRecord = agencyClients?.find((c: any) => c.client_user_id === u.id);
          const clientAgency = clientRecord ? agencyProfiles?.find((a: any) => a.id === clientRecord.agency_id) : null;

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
            banned_until: u.banned_until || null,
            subscription: sub ? { status: sub.status, plan: sub.plans ? { name: (sub.plans as any).name } : null, billing_cycle: sub.billing_cycle } : null,
            agency: agency ? { id: agency.id, agency_name: agency.agency_name, tier: agency.tier, active_clients_count: agency.active_clients_count } : null,
            client: clientRecord ? { id: clientRecord.id, client_name: clientRecord.client_name, agency_id: clientRecord.agency_id, agency_name: clientAgency?.agency_name || null } : null,
          };
        });

        return json({ users: combined });
      }

      /* ─── CREATE ─── */
      case "create": {
        const { email, password, full_name, role, tenant_type, agency_id, agency_name, tier } = body;
        if (!email || !password) return json({ error: "email and password required" }, 400);

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || email, role: role || "agency_owner", tenant_type: tenant_type || "agency" },
        });
        if (createError) {
          console.error("createUser error:", createError.message);
          return json({ error: createError.message }, 400);
        }

        // Profile is created by trigger, but update if role/tenant differs
        const effectiveRole = role || "agency_owner";
        const effectiveTenant = tenant_type || "agency";
        await supabase.from("profiles").update({ full_name, role: effectiveRole, tenant_type: effectiveTenant }).eq("user_id", newUser.user.id);

        // Create agency_profiles if agency role
        if (["agency_owner", "agency_admin", "agency_manager", "agency_member"].includes(effectiveRole) || effectiveTenant === "agency") {
          await supabase.from("agency_profiles").insert({
            user_id: newUser.user.id,
            agency_name: agency_name || full_name || email,
            tier: tier || "starter",
          });
        }

        // If client role, link to agency
        if (effectiveTenant === "client" && agency_id) {
          await supabase.from("agency_clients").insert({
            agency_id,
            client_name: full_name || email,
            client_email: email,
            client_user_id: newUser.user.id,
            status: "active",
          });
        }

        return json({ success: true, user_id: newUser.user.id });
      }

      /* ─── UPDATE ─── */
      case "update": {
        const { user_id, full_name, role, tenant_type, is_active } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);

        const profileUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
        if (full_name !== undefined) profileUpdate.full_name = full_name;
        if (role !== undefined) profileUpdate.role = role;
        if (tenant_type !== undefined) profileUpdate.tenant_type = tenant_type;
        if (is_active !== undefined) profileUpdate.is_active = is_active;

        const { error: profileError } = await supabase.from("profiles").update(profileUpdate).eq("user_id", user_id);
        if (profileError) return json({ error: profileError.message }, 500);

        // Sync auth metadata
        const metaUpdate: Record<string, any> = {};
        if (full_name !== undefined) metaUpdate.full_name = full_name;
        if (role !== undefined) metaUpdate.role = role;
        if (tenant_type !== undefined) metaUpdate.tenant_type = tenant_type;
        if (Object.keys(metaUpdate).length > 0) {
          await supabase.auth.admin.updateUserById(user_id, { user_metadata: metaUpdate });
        }

        return json({ success: true });
      }

      /* ─── SUSPEND ─── */
      case "suspend": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        await supabase.auth.admin.updateUserById(user_id, { ban_duration: "87600h" });
        await supabase.from("profiles").update({ is_active: false }).eq("user_id", user_id);
        return json({ success: true });
      }

      /* ─── UNSUSPEND ─── */
      case "unsuspend": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        await supabase.auth.admin.updateUserById(user_id, { ban_duration: "none" });
        await supabase.from("profiles").update({ is_active: true }).eq("user_id", user_id);
        return json({ success: true });
      }

      /* ─── DELETE ─── */
      case "delete": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);

        // Delete related data first
        const { data: agencyProfile } = await supabase.from("agency_profiles").select("id").eq("user_id", user_id).maybeSingle();
        if (agencyProfile) {
          // Delete client subscriptions, billing events, clients for this agency
          await supabase.from("client_template_subscriptions").delete().eq("agency_id", agencyProfile.id);
          await supabase.from("billing_events").delete().eq("agency_id", agencyProfile.id);
          await supabase.from("agency_clients").delete().eq("agency_id", agencyProfile.id);
          await supabase.from("agency_profiles").delete().eq("id", agencyProfile.id);
        }

        // Delete client records where this user is the client_user_id
        await supabase.from("agency_clients").update({ client_user_id: null }).eq("client_user_id", user_id);

        await supabase.from("subscriptions").delete().eq("user_id", user_id);
        await supabase.from("profiles").delete().eq("user_id", user_id);
        await supabase.auth.admin.deleteUser(user_id);

        return json({ success: true });
      }

      /* ─── RESET PASSWORD ─── */
      case "reset-password": {
        const { email } = body;
        if (!email) return json({ error: "email required" }, 400);
        const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
        if (error) return json({ error: error.message }, 400);
        return json({ success: true, link: data?.properties?.action_link || null });
      }

      /* ─── UPDATE AGENCY ─── */
      case "update-agency": {
        const { agency_id, agency_name, tier, tier_manually_overridden } = body;
        if (!agency_id) return json({ error: "agency_id required" }, 400);

        const agencyUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
        if (agency_name !== undefined) agencyUpdate.agency_name = agency_name;
        if (tier !== undefined) agencyUpdate.tier = tier;
        if (tier_manually_overridden !== undefined) agencyUpdate.tier_manually_overridden = tier_manually_overridden;

        const { error } = await supabase.from("agency_profiles").update(agencyUpdate).eq("id", agency_id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      /* ─── CREATE CLIENT ─── */
      case "create-client": {
        const { agency_id, client_name, client_email, client_phone, client_document, create_access, access_email, access_password, template_ids } = body;
        if (!agency_id || !client_name) return json({ error: "agency_id and client_name required" }, 400);

        let client_user_id: string | null = null;

        // Create workspace access if requested
        if (create_access && access_email && access_password) {
          const { data: clientUser, error: clientUserError } = await supabase.auth.admin.createUser({
            email: access_email,
            password: access_password,
            email_confirm: true,
            user_metadata: { full_name: client_name, role: "client_owner", tenant_type: "client" },
          });
          if (clientUserError) return json({ error: clientUserError.message }, 400);
          client_user_id = clientUser.user.id;
          await supabase.from("profiles").update({ role: "client_owner", tenant_type: "client", full_name: client_name }).eq("user_id", client_user_id);
        }

        // Create agency_clients entry
        const { data: newClient, error: clientError } = await supabase.from("agency_clients").insert({
          agency_id,
          client_name,
          client_email: client_email || null,
          client_phone: client_phone || null,
          client_document: client_document || null,
          client_user_id,
          status: "active",
        }).select("id").single();

        if (clientError) return json({ error: clientError.message }, 500);

        // Create template subscriptions if selected
        if (template_ids && template_ids.length > 0 && newClient) {
          const { data: templates } = await supabase.from("platform_templates").select("id, platform_price_monthly").in("id", template_ids);
          const { data: agencyProfile } = await supabase.from("agency_profiles").select("custom_pricing").eq("id", agency_id).single();
          const customPricing = agencyProfile?.custom_pricing || {};

          for (const tmpl of templates || []) {
            const agencyPrice = (customPricing as any)[tmpl.id]?.price || tmpl.platform_price_monthly * 2;
            await supabase.from("client_template_subscriptions").insert({
              agency_id,
              client_id: newClient.id,
              template_id: tmpl.id,
              agency_price_monthly: agencyPrice,
              platform_price_monthly: tmpl.platform_price_monthly,
              agency_profit_monthly: agencyPrice - tmpl.platform_price_monthly,
              status: "active",
            });
          }
        }

        return json({ success: true, client_id: newClient?.id, client_user_id });
      }

      /* ─── UPDATE CLIENT ─── */
      case "update-client": {
        const { client_id, client_name, client_email, client_phone, client_document, status } = body;
        if (!client_id) return json({ error: "client_id required" }, 400);

        const update: Record<string, any> = { updated_at: new Date().toISOString() };
        if (client_name !== undefined) update.client_name = client_name;
        if (client_email !== undefined) update.client_email = client_email;
        if (client_phone !== undefined) update.client_phone = client_phone;
        if (client_document !== undefined) update.client_document = client_document;
        if (status !== undefined) update.status = status;

        const { error } = await supabase.from("agency_clients").update(update).eq("id", client_id);
        if (error) return json({ error: error.message }, 500);

        // If suspended, also suspend subscriptions
        if (status === "suspended") {
          await supabase.from("client_template_subscriptions").update({ status: "suspended" }).eq("client_id", client_id).in("status", ["active", "trial"]);
        }

        return json({ success: true });
      }

      /* ─── DELETE CLIENT ─── */
      case "delete-client": {
        const { client_id } = body;
        if (!client_id) return json({ error: "client_id required" }, 400);

        // Get client info for user cleanup
        const { data: clientData } = await supabase.from("agency_clients").select("client_user_id").eq("id", client_id).single();

        await supabase.from("billing_events").delete().eq("client_id", client_id);
        await supabase.from("client_template_subscriptions").delete().eq("client_id", client_id);
        await supabase.from("agency_clients").delete().eq("id", client_id);

        // Delete client user if exists
        if (clientData?.client_user_id) {
          await supabase.from("profiles").delete().eq("user_id", clientData.client_user_id);
          await supabase.auth.admin.deleteUser(clientData.client_user_id);
        }

        return json({ success: true });
      }

      /* ─── CREATE WORKSPACE ACCESS ─── */
      case "create-workspace-access": {
        const { client_id, email, password, client_name } = body;
        if (!client_id || !email || !password) return json({ error: "client_id, email, password required" }, 400);

        const { data: clientUser, error: userError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: client_name || email, role: "client_owner", tenant_type: "client" },
        });
        if (userError) return json({ error: userError.message }, 400);

        await supabase.from("profiles").update({ role: "client_owner", tenant_type: "client", full_name: client_name || email }).eq("user_id", clientUser.user.id);
        await supabase.from("agency_clients").update({ client_user_id: clientUser.user.id }).eq("id", client_id);

        return json({ success: true, user_id: clientUser.user.id });
      }

      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (err) {
    console.error("admin-users error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
