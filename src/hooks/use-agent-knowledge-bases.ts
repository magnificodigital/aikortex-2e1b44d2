import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentKnowledgeBase {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  embedding_model: string;
  embedding_dim: number;
  chunk_size: number;
  chunk_overlap: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sprint 2.5-a — read-only hook.
 * Mutations (create/update/delete KBs) land in Sprint 2.5-c.
 */
export function useAgentKnowledgeBases(agentId: string | null | undefined) {
  const [knowledgeBases, setKnowledgeBases] = useState<AgentKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledgeBases = useCallback(async () => {
    if (!agentId) {
      setKnowledgeBases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase
      .from("agent_knowledge_bases" as any)
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true }) as any);

    if (error) {
      console.error("[useAgentKnowledgeBases] fetch error:", error);
      setError(error.message);
      setKnowledgeBases([]);
    } else {
      setError(null);
      setKnowledgeBases((data as AgentKnowledgeBase[]) || []);
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchKnowledgeBases(); }, [fetchKnowledgeBases]);

  return { knowledgeBases, loading, error, refetch: fetchKnowledgeBases };
}
