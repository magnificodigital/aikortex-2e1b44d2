import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AgentCadence, CadenceStep } from "@/types/agent-cadences";

function isRealAgentId(agentId: string | null | undefined): agentId is string {
  return !!agentId && !agentId.startsWith("new-");
}

export function useAgentCadences(agentId: string | null | undefined) {
  return useQuery({
    queryKey: ["agent-cadences", agentId],
    queryFn: async (): Promise<AgentCadence[]> => {
      if (!isRealAgentId(agentId)) return [];
      const { data, error } = await (supabase as any)
        .from("agent_cadences")
        .select("*, executions_count:cadence_executions(count)")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((c) => ({
        ...c,
        steps: Array.isArray(c.steps) ? c.steps : [],
        executions_count: Array.isArray(c.executions_count)
          ? c.executions_count[0]?.count ?? 0
          : 0,
      })) as AgentCadence[];
    },
    enabled: isRealAgentId(agentId),
  });
}

export function useCreateCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      agent_id: string;
      name: string;
      description?: string | null;
      steps: CadenceStep[];
      trigger_type?: "manual" | "auto";
      enabled?: boolean;
      from_name?: string | null;
      reply_to?: string | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from("agent_cadences")
        .insert({
          agent_id: payload.agent_id,
          name: payload.name,
          description: payload.description ?? null,
          steps: payload.steps,
          trigger_type: payload.trigger_type ?? "manual",
          enabled: payload.enabled ?? true,
          from_name: payload.from_name ?? null,
          reply_to: payload.reply_to ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agent-cadences", v.agent_id] });
      toast.success("Cadência criada");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useUpdateCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      agent_id: _agent_id,
      ...patch
    }: {
      id: string;
      agent_id: string;
      name?: string;
      description?: string | null;
      steps?: CadenceStep[];
      trigger_type?: "manual" | "auto";
      enabled?: boolean;
      from_name?: string | null;
      reply_to?: string | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from("agent_cadences")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agent-cadences", v.agent_id] });
      toast.success("Cadência atualizada");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useToggleCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; agent_id: string; enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from("agent_cadences")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agent-cadences", v.agent_id] });
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useDeleteCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; agent_id: string }) => {
      const { error } = await (supabase as any).from("agent_cadences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agent-cadences", v.agent_id] });
      toast.success("Cadência removida");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useScheduleCadenceExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      cadence_id: string;
      agent_id: string;
      contact_phone?: string | null;
      contact_name?: string | null;
      contact_metadata?: Record<string, any>;
      total_steps: number;
      next_run_at: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("cadence_executions")
        .insert({
          cadence_id: payload.cadence_id,
          agent_id: payload.agent_id,
          contact_phone: payload.contact_phone ?? null,
          contact_name: payload.contact_name ?? null,
          contact_metadata: payload.contact_metadata ?? {},
          current_step: 0,
          total_steps: payload.total_steps,
          status: "pending",
          next_run_at: payload.next_run_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agent-cadences", v.agent_id] });
      toast.success("Cadência agendada");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}
