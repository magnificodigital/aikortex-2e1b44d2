import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDefaultFlowForAgent } from "@/lib/agent-flow-builder";

export interface UserAgent {
  id: string;
  user_id: string;
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

export function useUserAgents() {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("user_agents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching agents:", error);
    } else {
      setAgents((data as any[]) || []);
    }
    setLoading(false);
  }, []);

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

    const payload = {
      user_id: user.id,
      name: agent.name,
      agent_type: agent.agent_type || "Custom",
      description: agent.description || "",
      avatar_url: agent.avatar_url || "",
      model: agent.model || "gemini-2.5-flash",
      provider: (agent as any).provider || "auto",
      status: agent.status || "configuring",
      config: agent.config || {},
      ...voiceColumns,
    };

    if (agent.id) {
      const { data, error } = await supabase
        .from("user_agents")
        .update(payload)
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
        .insert(payload)
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
