import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDefaultFlowForAgent } from "@/lib/agent-flow-builder";

export interface UserAgent {
  id: string;
  user_id: string;
  client_id: string | null;
  agent_type: string;
  name: string;
  description: string;
  avatar_url: string;
  model: string;
  provider: string;
  status: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useUserAgents(opts?: { clientId?: string | null; isAgencyMode?: boolean }) {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const clientId = opts?.clientId ?? null;
  const isAgencyMode = opts?.isAgencyMode ?? true;

  const fetchAgents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let q = supabase
      .from("user_agents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!isAgencyMode && clientId) q = q.eq("client_id", clientId);

    const { data, error } = await q;
    if (error) {
      console.error("Error fetching agents:", error);
    } else {
      setAgents((data as any[]) || []);
    }
    setLoading(false);
  }, [clientId, isAgencyMode]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const saveAgent = useCallback(async (agent: Partial<UserAgent> & { name: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login para salvar agentes."); return null; }

    // Extract voice columns from config.voiceConfig if present
    const vc = (agent.config as any)?.voiceConfig;
    const voiceColumns: Record<string, unknown> = {};
    if (vc) {
      if (vc.voiceId)        voiceColumns.voice_id = vc.voiceId;
      if (vc.language)       voiceColumns.voice_language = vc.language;
      if (typeof vc.tone === "number")  voiceColumns.voice_stability = vc.tone;
      if (typeof vc.speed === "number") voiceColumns.voice_similarity = vc.speed;
      if (vc.phoneNumber)    voiceColumns.telnyx_phone_number = vc.phoneNumber;
      if (typeof vc.maxCallDuration === "number") voiceColumns.max_call_duration_seconds = vc.maxCallDuration * 60;
    }

    // Default outcome tags por tipo de agente — Stark usa pra responder
    // perguntas tipo "quantas qualificações fez hoje?". User pode customizar
    // depois em Painel do agente > Comportamento > Outcomes.
    const DEFAULT_TRACKED_OUTCOMES: Record<string, string[]> = {
      SDR:    ["qualified", "disqualified", "meeting_booked", "no_show", "unresponsive"],
      SAC:    ["resolved", "escalated", "pending_info", "duplicate"],
      CS:     ["renewed", "churn_risk", "health_check_ok", "expansion_opportunity"],
      BDR:    ["prospected", "meeting_booked", "unqualified", "follow_up"],
      Custom: ["completed", "failed", "follow_up"],
    };
    const agentType = agent.agent_type || "Custom";
    const incomingConfig = (agent.config ?? {}) as Record<string, unknown>;
    const configWithDefaults: Record<string, unknown> = { ...incomingConfig };
    // Só injeta default se ainda não tiver — preserva customização do user.
    if (!Array.isArray((incomingConfig as any).tracked_outcomes)) {
      configWithDefaults.tracked_outcomes =
        DEFAULT_TRACKED_OUTCOMES[agentType] || DEFAULT_TRACKED_OUTCOMES.Custom;
    }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      name: agent.name,
      agent_type: agentType,
      description: agent.description || "",
      avatar_url: agent.avatar_url || "",
      model: agent.model || "gemini-2.5-flash",
      provider: (agent as any).provider || "auto",
      status: agent.status || "configuring",
      config: configWithDefaults,
      ...voiceColumns,
    };
    if (agent.client_id !== undefined) payload.client_id = agent.client_id;

    if (agent.id) {
      // BUG fix: antes fazia overwrite total do config, apagando campos que o
      // wizard salva (businessContext.niche, wizard_completed, pendingNicheTables,
      // createdTables, createdCadences, createdKbs, etc) e que o painel não
      // conhece. Agora faz MERGE: lê config atual do DB, mescla com o novo,
      // preservando chaves desconhecidas no top-level.
      const { data: existing } = await supabase
        .from("user_agents")
        .select("config")
        .eq("id", agent.id)
        .eq("user_id", user.id)
        .maybeSingle();
      const existingCfg = (existing as { config?: Record<string, unknown> } | null)?.config ?? {};
      const incomingCfg = (agent.config ?? {}) as Record<string, unknown>;
      // Merge top-level: incomingCfg ganha em conflito; chaves só no existing
      // (ex: businessContext, wizard_completed, createdTables) são preservadas.
      payload.config = { ...existingCfg, ...incomingCfg };

      const { data, error } = await supabase
        .from("user_agents")
        .update(payload as any)
        .eq("id", agent.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) { toast.error("Erro ao atualizar agente."); return null; }
      setAgents(prev => prev.map(a => a.id === agent.id ? (data as any) : a));
      return data as any as UserAgent;
    } else {
      const { data, error } = await supabase
        .from("user_agents")
        .insert(payload as any)
        .select()
        .single();

      if (error) { toast.error("Erro ao criar agente."); return null; }
      const created = data as any as UserAgent;
      setAgents(prev => [created, ...prev]);

      // Auto-create a default automation flow for this new agent
      try {
        const flow = buildDefaultFlowForAgent(created);
        await (supabase.from("user_flows" as any).insert({
          user_id: user.id,
          name: flow.name,
          description: flow.description,
          nodes: flow.nodes,
          edges: flow.edges,
          is_active: false,
          trigger_type: "trigger_chat",
          trigger_config: { agent_id: created.id },
        }) as any);
        toast.success("Agente criado — fluxo de automação gerado!");
      } catch (e) {
        console.error("Failed to auto-create flow for agent:", e);
        // Don't fail agent creation if flow creation fails
      }

      return created;
    }
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("user_agents")
      .delete()
      .eq("id", id);

    if (error) { toast.error("Erro ao excluir agente."); return false; }
    setAgents(prev => prev.filter(a => a.id !== id));
    return true;
  }, []);

  return { agents, loading, saveAgent, deleteAgent, refetch: fetchAgents };
}
