import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CadenceExecutionStatus } from "@/types/agent-cadences";

export type CadenceExecutionRow = {
  id: string;
  cadence_id: string;
  agent_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_metadata: Record<string, any>;
  current_step: number;
  total_steps: number;
  status: CadenceExecutionStatus;
  started_at: string;
  next_run_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  metadata: Record<string, any>;
  created_at: string;
  cadence_name?: string;
};

export type ExecutionsFilter = {
  status?: CadenceExecutionStatus | "all";
  cadenceId?: string | "all";
  contactSearch?: string;
  /** ISO date string, inclusivo */
  startedSince?: string;
  pageSize?: number;
};

export function useCadenceExecutions(agentId: string | null | undefined, filter: ExecutionsFilter = {}) {
  return useQuery({
    queryKey: ["cadence-executions", agentId, filter],
    queryFn: async (): Promise<CadenceExecutionRow[]> => {
      if (!agentId || agentId.startsWith("new-")) return [];

      let query = supabase
        .from("cadence_executions")
        .select("*, cadence:agent_cadences(name)")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(filter.pageSize ?? 100);

      if (filter.status && filter.status !== "all") {
        query = query.eq("status", filter.status);
      }
      if (filter.cadenceId && filter.cadenceId !== "all") {
        query = query.eq("cadence_id", filter.cadenceId);
      }
      if (filter.contactSearch && filter.contactSearch.trim()) {
        const s = `%${filter.contactSearch.trim()}%`;
        query = query.or(`contact_name.ilike.${s},contact_phone.ilike.${s}`);
      }
      if (filter.startedSince) {
        query = query.gte("created_at", filter.startedSince);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        ...row,
        cadence_name: row.cadence?.name,
        contact_metadata: row.contact_metadata ?? {},
        metadata: row.metadata ?? {},
      })) as CadenceExecutionRow[];
    },
    enabled: !!agentId && !agentId.startsWith("new-"),
  });
}

export type CadenceExecutionStats = {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  paused: number;
  successRate: number; // 0..1 (completed / (completed+failed))
  unsubscribedCount: number;
};

export function useCadenceExecutionStats(agentId: string | null | undefined) {
  return useQuery({
    queryKey: ["cadence-execution-stats", agentId],
    queryFn: async (): Promise<CadenceExecutionStats> => {
      const empty: CadenceExecutionStats = {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        paused: 0,
        successRate: 0,
        unsubscribedCount: 0,
      };
      if (!agentId || agentId.startsWith("new-")) return empty;

      const { data, error } = await supabase
        .from("cadence_executions")
        .select("status, last_error")
        .eq("agent_id", agentId);
      if (error) throw error;

      const stats = { ...empty };
      (data ?? []).forEach((row: any) => {
        stats.total++;
        const s = row.status as CadenceExecutionStatus;
        if (s in stats) (stats as any)[s]++;
        if (row.last_error === "recipient_unsubscribed") stats.unsubscribedCount++;
      });

      const denom = stats.completed + stats.failed;
      stats.successRate = denom > 0 ? stats.completed / denom : 0;
      return stats;
    },
    enabled: !!agentId && !agentId.startsWith("new-"),
    refetchInterval: 30_000, // atualiza a cada 30s pra UI ficar "viva"
  });
}
