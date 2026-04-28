import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_HEADERS = (apiKey: string) => ({
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "managed-agents-2026-04-01",
  "Content-Type": "application/json",
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent_db_id, action } = await req.json();

    if (!agent_db_id) {
      return new Response(JSON.stringify({ error: "agent_db_id é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada no servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from("user_agents")
      .select("*")
      .eq("id", agent_db_id)
      .eq("user_id", user.id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agente não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deactivate memory ──
    if (action === "deactivate") {
      await adminClient
        .from("agent_memory_stores")
        .delete()
        .eq("agent_id", agent_db_id)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true, action: "deactivated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Activate / Sync memory ──

    // Check if already exists
    const { data: existing } = await supabase
      .from("agent_memory_stores")
      .select("*")
      .eq("agent_id", agent_db_id)
      .maybeSingle();

    if (existing?.anthropic_memory_store_id) {
      return new Response(JSON.stringify({
        success: true,
        memory_store_id: existing.anthropic_memory_store_id,
        already_exists: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create memory store via Anthropic API
    const createResp = await fetch(`${ANTHROPIC_BASE}/memory_stores`, {
      method: "POST",
      headers: ANTHROPIC_HEADERS(anthropicApiKey),
      body: JSON.stringify({
        name: `Memória do agente ${agent.name}`,
      }),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      console.error("Failed to create memory store:", createResp.status, errText);

      // Handle preview/unavailable gracefully
      if (createResp.status === 404 || createResp.status === 501) {
        return new Response(JSON.stringify({
          error: "Funcionalidade de memória em preview. Disponível em breve.",
          preview: true,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao criar memory store na Anthropic." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memoryStore = await createResp.json();
    const memoryStoreId = memoryStore.id;

    // Save to database
    if (existing) {
      await adminClient
        .from("agent_memory_stores")
        .update({ anthropic_memory_store_id: memoryStoreId })
        .eq("id", existing.id);
    } else {
      await adminClient.from("agent_memory_stores").insert({
        user_id: user.id,
        agent_id: agent_db_id,
        anthropic_memory_store_id: memoryStoreId,
        name: `Memória do agente ${agent.name}`,
      });
    }

    // Update agent definition to include memory store (if anthropic_agent_id exists)
    if (agent.anthropic_agent_id) {
      try {
        await fetch(`${ANTHROPIC_BASE}/agents/${agent.anthropic_agent_id}`, {
          method: "PATCH",
          headers: ANTHROPIC_HEADERS(anthropicApiKey),
          body: JSON.stringify({
            memory_stores: [{ memory_store_id: memoryStoreId, prefixes: ["contact:", "deal:", "preference:"] }],
          }),
        });
      } catch (e) {
        console.warn("Failed to update agent definition with memory store:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      memory_store_id: memoryStoreId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-memory-store error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
