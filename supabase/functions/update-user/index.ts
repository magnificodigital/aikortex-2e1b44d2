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
    const supabase = createClient(
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
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile || !["platform_owner", "platform_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { user_id, full_name, role, tenant_type, is_active } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build profile update
    const profileUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (role !== undefined) {
      profileUpdate.role = role;
      profileUpdate.tenant_type = ["platform_owner", "platform_admin"].includes(role) ? "platform" : 
        ["client_owner", "client_viewer"].includes(role) ? "client" : "agency";
    }
    if (tenant_type !== undefined) profileUpdate.tenant_type = tenant_type;
    if (is_active !== undefined) profileUpdate.is_active = is_active;

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", user_id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth metadata if name or role changed
    const metaUpdate: Record<string, any> = {};
    if (full_name !== undefined) metaUpdate.full_name = full_name;
    if (role !== undefined) {
      metaUpdate.role = role;
      metaUpdate.tenant_type = profileUpdate.tenant_type;
    }

    if (Object.keys(metaUpdate).length > 0) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: metaUpdate,
      });
      if (authUpdateError) {
        console.error("Auth metadata update error:", authUpdateError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("update-user error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
