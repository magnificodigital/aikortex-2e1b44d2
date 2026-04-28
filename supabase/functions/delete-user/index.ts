import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  user_id: z.string().uuid("ID de usuário inválido"),
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

    // Only platform users can delete users
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

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = parsed.data;

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete profile first (cascade will handle related data)
    await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);
    await supabaseAdmin.from("workspace_members").delete().eq("member_user_id", user_id);
    await supabaseAdmin.from("partner_tiers").delete().eq("user_id", user_id);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
