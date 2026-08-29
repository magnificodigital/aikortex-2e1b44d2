import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fase 3 — quota de mensagens de teste por agente (anti-abuso).
// Teste = sandbox barato; pré-publicação tem teto de mensagens grátis.
// Fonte da verdade é user_agents.test_messages_used (server-side via RPC).
export const TEST_QUOTA_LIMIT = 40;

export function useTestQuota(agentId: string | undefined, opts?: { enabled?: boolean }) {
  const [used, setUsed] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const isRealAgent = !!agentId && !agentId.startsWith("new-") && agentId !== "new";
  const enabled = (opts?.enabled ?? true) && isRealAgent;

  useEffect(() => {
    if (!enabled) { setLoaded(true); return; }
    let alive = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_agents")
        .select("test_messages_used")
        .eq("id", agentId!)
        .maybeSingle();
      if (!alive) return;
      if (!error && data) setUsed((data as any).test_messages_used ?? 0);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [agentId, enabled]);

  // Incrementa no servidor e reflete localmente. Retorna o novo total.
  const bump = useCallback(async (): Promise<number> => {
    if (!enabled) return used;
    const { data, error } = await (supabase as any).rpc("bump_agent_test_usage", { p_agent_id: agentId });
    const next = !error && typeof data === "number" ? data : used + 1;
    setUsed(next);
    return next;
  }, [agentId, enabled, used]);

  const remaining = Math.max(0, TEST_QUOTA_LIMIT - used);

  return { used, remaining, limit: TEST_QUOTA_LIMIT, atLimit: used >= TEST_QUOTA_LIMIT, loaded, bump };
}
