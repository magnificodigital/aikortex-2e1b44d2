import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  full_name: z.string().min(1, "Nome é obrigatório").max(255),
  role: z.enum([
    "platform_owner", "platform_admin",
    "agency_owner", "agency_admin", "agency_manager", "agency_member",
    "client_owner", "client_viewer",
  ]),
  tenant_type: z.enum(["platform", "agency", "client"]).default("agency"),
  department: z.string().optional(),
  job_title: z.string().optional(),
});

const mapAuthError = (message: string) => {
  if (message.includes("already been registered")) return "Este e-mail já está em uso";
  if (message.toLowerCase().includes("weak")) return "Senha muito fraca";
  return message;
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

    // Verify caller auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller profile
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, tenant_type")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Perfil do chamador não encontrado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, role, tenant_type, department, job_title } = parsed.data;

    // Authorization: platform users can create agencies, agency owners can create members
    const isPlatform = ["platform_owner", "platform_admin"].includes(callerProfile.role);
    const isAgencyOwner = ["agency_owner", "agency_admin"].includes(callerProfile.role);

    if (!isPlatform && !isAgencyOwner) {
      return new Response(JSON.stringify({ error: "Sem permissão para criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agency owners can only create agency members
    if (isAgencyOwner && !isPlatform) {
      const allowedRoles = ["agency_admin", "agency_manager", "agency_member"];
      if (!allowedRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Você só pode criar membros da agência" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create user via admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, tenant_type },
    });

    if (createError) {
      const msg = mapAuthError(createError.message);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: newUser.user!.id,
        full_name,
        role,
        tenant_type,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (role === "agency_owner" && tenant_type === "agency") {
      const { data: existingAgency } = await supabaseAdmin
        .from("agency_profiles")
        .select("id")
        .eq("user_id", newUser.user!.id)
        .maybeSingle();

      if (!existingAgency) {
        await supabaseAdmin.from("agency_profiles").insert({
          user_id: newUser.user!.id,
          agency_name: full_name,
          tier: "starter",
        });
      }
    }

    // If creating an agency owner, create partner_tiers entry
    if (role === "agency_owner") {
      await supabaseAdmin.from("partner_tiers").insert({
        user_id: newUser.user!.id,
        tier: "starter",
      });
    }

    // If agency owner is creating a member, add to workspace_members
    if (isAgencyOwner && !isPlatform) {
      await supabaseAdmin.from("workspace_members").insert({
        workspace_owner_id: caller.id,
        member_user_id: newUser.user!.id,
        role,
        department: department || null,
        job_title: job_title || null,
        status: "active",
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user!.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
