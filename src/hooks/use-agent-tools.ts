import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ToolKey } from "@/types/agent-tools";

export interface AgentToolRow {
  tool_key: ToolKey;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Manages enabled tools for a single agent (Sprint 2.4-a).
 * Persists per-tool enabled state in `agent_tools`.
 */
export function useAgentTools(agentId: string | undefined) {
  const [tools, setTools] = useState<AgentToolRow[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("agent_tools" as any)
      .select("tool_key, enabled, config")
      .eq("agent_id", agentId);
    setTools(((data as unknown) as AgentToolRow[]) || []);
    setLoading(false);
  }, [agentId]);

  const refreshUsage = useCallback(async () => {
    const { data: profile } = await supabase
      .from("agency_profiles")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
      .maybeSingle();
    if (!profile?.id) return;
    const yearMonth = new Date().toISOString().slice(0, 7);
    const { data } = await supabase.rpc("get_agency_tool_usage" as any, {
      p_agency_id: profile.id,
      p_year_month: yearMonth,
    });
    const map: Record<string, number> = {};
    ((data as any[]) || []).forEach((r) => { map[r.tool_key] = r.call_count; });
    setUsage(map);
  }, []);

  useEffect(() => {
    refresh();
    refreshUsage();
  }, [refresh, refreshUsage]);

  const setEnabled = useCallback(
    async (toolKey: ToolKey, enabled: boolean) => {
      if (!agentId) return;
      const existing = tools.find((t) => t.tool_key === toolKey);
      if (existing) {
        await supabase
          .from("agent_tools" as any)
          .update({ enabled })
          .eq("agent_id", agentId)
          .eq("tool_key", toolKey);
      } else {
        await supabase
          .from("agent_tools" as any)
          .insert({ agent_id: agentId, tool_key: toolKey, enabled, config: {} });
      }
      await refresh();
    },
    [agentId, tools, refresh],
  );

  const isEnabled = useCallback(
    (key: ToolKey) => tools.some((t) => t.tool_key === key && t.enabled),
    [tools],
  );

  const activeCount = tools.filter((t) => t.enabled).length;

  return { tools, usage, loading, isEnabled, setEnabled, activeCount, refresh };
}
