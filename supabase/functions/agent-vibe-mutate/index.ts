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
  | "request_external_integration"
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

        // Quando ATIVANDO, checa estado da integração da agência e devolve
        // info (quando OK) OU warning (quando falta). LLM lê e comunica
        // explicitamente — sem confiança falsa nem silêncio sobre o que existe.
        if (enabled) {
          let warning: string | null = null;
          let info: string | null = null;
          if (channel === "email") {
            const { data: secrets } = await admin
              .from("agency_secrets")
              .select("resend_api_key, resend_from_email")
              .eq("agency_user_id", agent.user_id)
              .maybeSingle();
            if (!secrets?.resend_api_key || !secrets?.resend_from_email) {
              warning = `Email marcado como canal, mas sua conta Resend ainda não está conectada. Pra esse agente enviar emails de verdade, o usuário precisa configurar em Configurações → Canais → Email → Gerenciar.`;
            } else {
              info = `Email marcado — sua conta Resend já está conectada (${secrets.resend_from_email}), o agente vai poder enviar emails de verdade.`;
            }
          } else if (channel === "whatsapp") {
            const { data: keys } = await admin
              .from("user_api_keys")
              .select("provider, api_key")
              .eq("user_id", agent.user_id)
              .in("provider", ["whatsapp_access_token", "whatsapp_phone_number_id"]);
            const hasToken = (keys ?? []).some((k: any) => k.provider === "whatsapp_access_token");
            const hasPhoneId = (keys ?? []).some((k: any) => k.provider === "whatsapp_phone_number_id");
            if (!hasToken || !hasPhoneId) {
              warning = `WhatsApp marcado como canal, mas a WhatsApp Business API (Meta Cloud) ainda não está conectada. Pra esse agente enviar/receber mensagens reais, o usuário precisa configurar em Configurações → Canais → WhatsApp → Gerenciar.`;
            } else {
              info = `WhatsApp marcado — sua conta Meta Cloud API já está conectada, o agente vai poder enviar e responder mensagens.`;
            }
          } else if (["instagram", "facebook", "telegram", "tiktok", "linkedin"].includes(channel)) {
            warning = `Canal "${channel}" marcado, mas ainda não há integração implementada na plataforma (em breve). O agente vai operar só onde houver canal real ativo.`;
          } else if (channel === "voice") {
            const { data: secrets } = await admin
              .from("agency_secrets")
              .select("telnyx_api_key, elevenlabs_api_key")
              .eq("agency_user_id", agent.user_id)
              .maybeSingle();
            if (!secrets?.telnyx_api_key && !secrets?.elevenlabs_api_key) {
              warning = `Voz marcada como canal, mas nem Telnyx nem ElevenLabs estão conectados. Pra chamadas reais, configure em Configurações → Canais → Voz → Gerenciar.`;
            } else {
              info = `Voz marcada — sua integração de voz (${secrets.telnyx_api_key ? "Telnyx" : ""}${secrets.telnyx_api_key && secrets.elevenlabs_api_key ? " + " : ""}${secrets.elevenlabs_api_key ? "ElevenLabs" : ""}) já está conectada.`;
            }
          }

          // Aplica mutation e devolve info/warning quando relevante
          if (warning || info) {
            const { error: updErr } = await admin
              .from("user_agents")
              .update({ config: newConfig, draft_updated_at: new Date().toISOString() })
              .eq("id", agentId);
            if (updErr) return jsonRes({ error: "UPDATE_FAILED", details: updErr.message }, 500);
            return jsonRes({ ok: true, action, log: logMessage, warning, info });
          }
        }
        break;
      }
      case "request_external_integration": {
        // Master v7.4 §13.16: agente reconhece ferramentas externas que o user
        // pede (Google Calendar, HubSpot, etc.). Marca a intenção no draft e
        // devolve estado real (conectada ou precisa configurar).
        const integrationKey = String(params.integration_key ?? "").toLowerCase().replace(/[\s-]/g, "_");
        const validIntegrations: Record<string, { label: string; provider: string; configPath: string }> = {
          google_calendar: { label: "Google Calendar", provider: "google_calendar", configPath: "Configurações → Integrações → Google Calendar" },
          outlook_calendar: { label: "Outlook Calendar", provider: "outlook_calendar", configPath: "Configurações → Integrações → Outlook Calendar" },
          calendly: { label: "Calendly", provider: "calendly", configPath: "Configurações → Integrações → Calendly" },
          google_sheets: { label: "Google Sheets", provider: "google_sheets", configPath: "Configurações → Integrações → Google Sheets" },
          google_drive: { label: "Google Drive", provider: "google_drive", configPath: "Configurações → Integrações → Google Drive" },
          gmail: { label: "Gmail", provider: "gmail", configPath: "Configurações → Integrações → Gmail" },
          hubspot: { label: "HubSpot", provider: "hubspot", configPath: "Configurações → Integrações → HubSpot" },
          piperun: { label: "PipeRun", provider: "piperun", configPath: "Configurações → Integrações → PipeRun" },
          rd_station: { label: "RD Station", provider: "rd_station", configPath: "Configurações → Integrações → RD Station" },
        };
        const intCfg = validIntegrations[integrationKey];
        if (!intCfg) {
          return jsonRes({
            error: "INVALID_INTEGRATION",
            message: `Integração "${integrationKey}" não reconhecida. Disponíveis: ${Object.keys(validIntegrations).join(", ")}`,
            validIntegrations: Object.keys(validIntegrations),
          }, 400);
        }
        // Marca no draft que essa integração foi solicitada
        const existing = (newConfig.externalIntegrations ?? []) as string[];
        if (!existing.includes(integrationKey)) {
          newConfig = { ...newConfig, externalIntegrations: [...existing, integrationKey] };
        }
        // Checa estado real da integração via user_api_keys
        const { data: existingKey } = await admin
          .from("user_api_keys")
          .select("api_key")
          .eq("user_id", agent.user_id)
          .eq("provider", intCfg.provider)
          .maybeSingle();
        let info: string | null = null;
        let warning: string | null = null;
        if (existingKey?.api_key) {
          logMessage = `Integração ${intCfg.label}: ✓ conectada`;
          info = `${intCfg.label} marcada — sua integração JÁ ESTÁ CONECTADA na agência, o agente vai poder usar.`;
        } else {
          logMessage = `Integração ${intCfg.label}: ⚠️ não conectada (precisa OAuth)`;
          warning = `${intCfg.label} foi MARCADA COMO DESEJADA, mas a integração AINDA NÃO ESTÁ CONECTADA. NÃO DIGA "está configurada" ou "está pronta" — diga ao usuário que ele precisa conectar OAuth em ${intCfg.configPath} pra integração funcionar de verdade.`;
        }

        const { error: updErr } = await admin
          .from("user_agents")
          .update({ config: newConfig, draft_updated_at: new Date().toISOString() })
          .eq("id", agentId);
        if (updErr) return jsonRes({ error: "UPDATE_FAILED", details: updErr.message }, 500);
        return jsonRes({ ok: true, action, log: logMessage, info, warning });
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
