import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MemoryStore {
  id: string;
  agent_id: string;
  anthropic_memory_store_id: string | null;
  name: string;
  description: string | null;
}

export function useAgentMemory(agentId: string | undefined) {
  const queryClient = useQueryClient();
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const { data: memoryStore, isLoading } = useQuery({
    queryKey: ["agent-memory", agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const { data, error } = await supabase
        .from("agent_memory_stores")
        .select("*")
        .eq("agent_id", agentId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching memory store:", error);
        return null;
      }
      return data as MemoryStore | null;
    },
    enabled: !!agentId,
    refetchInterval: 60000,
  });

  const isActive = !!memoryStore?.anthropic_memory_store_id;

  const activateMemory = useCallback(async () => {
    if (!agentId) return;
    setIsActivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Faça login para ativar memória.");
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-memory-store`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ agent_db_id: agentId }),
        }
      );

      const result = await resp.json();

      if (!resp.ok) {
        if (result.preview) {
          toast.info("Funcionalidade de memória em preview. Disponível em breve.");
        } else {
          toast.error(result.error || "Erro ao ativar memória.");
        }
        return;
      }

      toast.success("Memória ativada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["agent-memory", agentId] });
    } catch (e) {
      console.error("Activate memory error:", e);
      toast.error("Erro ao ativar memória.");
    } finally {
      setIsActivating(false);
    }
  }, [agentId, queryClient]);

  const deactivateMemory = useCallback(async () => {
    if (!agentId) return;
    setIsDeactivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Faça login.");
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-memory-store`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ agent_db_id: agentId, action: "deactivate" }),
        }
      );

      if (!resp.ok) {
        const result = await resp.json();
        toast.error(result.error || "Erro ao desativar memória.");
        return;
      }

      toast.success("Memória desativada.");
      queryClient.invalidateQueries({ queryKey: ["agent-memory", agentId] });
    } catch (e) {
      console.error("Deactivate memory error:", e);
      toast.error("Erro ao desativar memória.");
    } finally {
      setIsDeactivating(false);
    }
  }, [agentId, queryClient]);

  return {
    memoryStore,
    isActive,
    isLoading,
    isActivating,
    isDeactivating,
    activateMemory,
    deactivateMemory,
  };
}
