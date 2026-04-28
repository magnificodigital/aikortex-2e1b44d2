import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido"),
  new_password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

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
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPlatform = ["platform_owner", "platform_admin"].includes(callerProfile.role);
    const isAgencyOwner = ["agency_owner", "agency_admin"].includes(callerProfile.role);

    if (!isPlatform && !isAgencyOwner) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, new_password } = parsed.data;

    // If agency owner, verify the target is their member
    if (isAgencyOwner && !isPlatform) {
      const { data: member } = await supabaseAdmin
        .from("workspace_members")
        .select("id")
        .eq("workspace_owner_id", caller.id)
        .eq("member_user_id", user_id)
        .single();

      if (!member) {
        return new Response(JSON.stringify({ error: "Usuário não pertence ao seu workspace" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
