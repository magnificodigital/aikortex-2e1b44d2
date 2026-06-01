// Edge function chamada via tool-calling do Modo Vibe (Master v7.4 §13.2 + §13.16).
// Recebe ação semântica + params do wizard e aplica no draft do user_agents.
//
// Princípio: o wizard agora AGE em vez de só perguntar. Quando user diz
// "quero que ele agende consultas no Google Agenda", o LLM chama:
//   { action: "add_tool", params: { tool_key: "google_calendar_book" }, agentId }
// e o draft é mutado em tempo real. Frontend escuta via Supabase Realtime.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MutateAction =
  | "set_agent_name"
  | "set_agent_description"
  | "set_company_name"
  | "set_tone_of_voice"
  | "set_objective"
  | "set_instructions"
  | "set_greeting_message"
  | "set_capability"
  | "add_tool"
  | "remove_tool"
  | "set_channel"
  | "set_niche"
  | "commit_draft";

type MutateRequest = {
  agentId: string;
  action: MutateAction;
  params: Record<string, unknown>;
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function deepSetConfig(config: Record<string, any>, path: string[], value: any): Record<string, any> {
  const next = { ...config };
  let cur: any = next;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    cur[key] = { ...(cur[key] ?? {}) };
    cur = cur[key];
  }
  cur[path[path.length - 1]] = value;
  return next;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth: aceita JWT do usuário OU service role (chamado interno do app-chat)
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return jsonRes({ error: "UNAUTHORIZED" }, 401);

  let body: MutateRequest;
  try { body = await req.json(); } catch { return jsonRes({ error: "INVALID_JSON" }, 400); }

  const { agentId, action, params } = body ?? {};
  if (!agentId || !action) return jsonRes({ error: "MISSING_FIELDS", message: "agentId e action obrigatórios" }, 400);

  // Carrega o agente atual (admin client; ownership validado via service role)
  const { data: agent, error: agentErr } = await admin
    .from("user_agents")
    .select("id, user_id, name, description, config")
    .eq("id", agentId)
    .maybeSingle();
  if (agentErr || !agent) {
    return jsonRes({ error: "AGENT_NOT_FOUND", details: agentErr }, 404);
  }

  const currentConfig = (agent.config as Record<string, any>) ?? {};
  let updates: Record<string, any> = {};
  let newConfig = currentConfig;
  let logMessage = "";

  try {
    switch (action) {
      case "set_agent_name": {
        const name = String(params.name ?? "").trim();
        if (!name) return jsonRes({ error: "INVALID_PARAMS", message: "name obrigatório" }, 400);
        updates.name = name;
        logMessage = `Nome do agente: "${name}"`;
        break;
      }
      case "set_agent_description": {
        const description = String(params.description ?? "").trim();
        updates.description = description;
        logMessage = `Descrição atualizada`;
        break;
      }
      case "set_company_name": {
        const companyName = String(params.companyName ?? params.company_name ?? "").trim();
        newConfig = deepSetConfig(newConfig, ["businessContext", "companyName"], companyName);
        logMessage = `Empresa: "${companyName}"`;
        break;
      }
      case "set_tone_of_voice": {
        const tone = String(params.tone ?? params.toneOfVoice ?? "").trim();
        newConfig = deepSetConfig(newConfig, ["businessContext", "toneOfVoice"], tone);
        logMessage = `Tom de voz: "${tone}"`;
        break;
      }
      case "set_objective": {
        const objective = String(params.objective ?? "").trim();
        newConfig = deepSetConfig(newConfig, ["profile", "primaryGoal"], objective);
        logMessage = `Objetivo: "${objective.slice(0, 60)}${objective.length > 60 ? "…" : ""}"`;
        break;
      }
      case "set_instructions": {
        const instructions = String(params.instructions ?? "").trim();
        newConfig = deepSetConfig(newConfig, ["profile", "instructions"], instructions);
        logMessage = `Instruções atualizadas (${instructions.length} chars)`;
        break;
      }
      case "set_greeting_message": {
        const greeting = String(params.message ?? params.greetingMessage ?? "").trim();
        newConfig = deepSetConfig(newConfig, ["businessContext", "greetingMessage"], greeting);
        logMessage = `Saudação atualizada`;
        break;
      }
      case "set_capability": {
        const key = String(params.key ?? "");
        const enabled = Boolean(params.enabled);
        const validKeys = ["planning", "reasoning", "code_runtime", "memory", "auto_integration"];
        if (!validKeys.includes(key)) {
          return jsonRes({ error: "INVALID_CAPABILITY", validKeys }, 400);
        }
        const caps = { ...(newConfig.capabilities ?? {}), [key]: enabled };
        newConfig = { ...newConfig, capabilities: caps };
        logMessage = `Capacidade "${key}": ${enabled ? "ativada" : "desativada"}`;
        break;
      }
      case "set_channel": {
        const channel = String(params.channel ?? "");
        const enabled = Boolean(params.enabled);
        const validChannels = ["email", "whatsapp", "voice", "sms", "instagram", "facebook", "telegram", "tiktok", "linkedin", "website"];
        if (!validChannels.includes(channel)) {
          return jsonRes({ error: "INVALID_CHANNEL", validChannels }, 400);
        }
        const channels = { ...(newConfig.channels ?? {}), [channel]: enabled };
        newConfig = { ...newConfig, channels };
        logMessage = `Canal "${channel}": ${enabled ? "ativado" : "desativado"}`;
        break;
      }
      case "set_niche": {
        const niche = String(params.niche ?? "").trim();
        newConfig = deepSetConfig(newConfig, ["businessContext", "niche"], niche);
        logMessage = `Nicho: "${niche}"`;
        break;
      }
      case "add_tool": {
        const tool_key = String(params.tool_key ?? "");
        const validTools = ["web_search", "image_gen", "knowledge_search", "table_read", "table_write"];
        if (!validTools.includes(tool_key)) {
          return jsonRes({ error: "INVALID_TOOL_KEY", validTools }, 400);
        }
        await admin.from("agent_tools").upsert(
          { agent_id: agentId, tool_key, enabled: true, config: params.config ?? {} },
          { onConflict: "agent_id,tool_key" },
        );
        logMessage = `Tool "${tool_key}" adicionada`;
        // Não precisa de update no user_agents — agent_tools tem RLS por agent
        return jsonRes({ ok: true, action, log: logMessage });
      }
      case "remove_tool": {
        const tool_key = String(params.tool_key ?? "");
        await admin.from("agent_tools")
          .update({ enabled: false })
          .eq("agent_id", agentId)
          .eq("tool_key", tool_key);
        logMessage = `Tool "${tool_key}" removida`;
        return jsonRes({ ok: true, action, log: logMessage });
      }
      case "commit_draft": {
        // Marca o agente como pronto pra revisão final do usuário. O status
        // "draft" continua mas com flag de "wizard_completed" no config.
        newConfig = { ...newConfig, wizard_completed: true, wizard_completed_at: new Date().toISOString() };
        logMessage = `Wizard concluído. Draft pronto pra revisar.`;
        break;
      }
      default:
        return jsonRes({ error: "UNKNOWN_ACTION", action }, 400);
    }

    // Aplica updates se houver mudança em colunas top-level
    if (Object.keys(updates).length > 0 || newConfig !== currentConfig) {
      const payload: Record<string, any> = { ...updates };
      if (newConfig !== currentConfig) payload.config = newConfig;
      payload.draft_updated_at = new Date().toISOString();

      const { error: updErr } = await admin
        .from("user_agents")
        .update(payload)
        .eq("id", agentId);
      if (updErr) {
        return jsonRes({ error: "UPDATE_FAILED", details: updErr.message }, 500);
      }
    }

    console.log(`[agent-vibe-mutate] ${agentId} ${action}: ${logMessage}`);
    return jsonRes({ ok: true, action, log: logMessage });
  } catch (err) {
    console.error("[agent-vibe-mutate] exception:", err);
    return jsonRes({ error: "INTERNAL", message: String(err) }, 500);
  }
});
