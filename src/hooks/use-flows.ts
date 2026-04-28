import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SavedFlow } from "@/types/flow-builder";

interface DbFlow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  is_active: boolean | null;
  trigger_type: string | null;
  trigger_config: unknown;
  created_at: string | null;
  updated_at: string | null;
}

function dbToSavedFlow(f: DbFlow): SavedFlow {
  return {
    id: f.id,
    name: f.name,
    description: f.description || `${(f.nodes as unknown[])?.length || 0} blocos`,
    status: f.is_active ? "active" : "draft",
    folderId: null,
    nodes: f.nodes || [],
    edges: f.edges || [],
    createdAt: f.created_at || new Date().toISOString(),
    updatedAt: f.updated_at || new Date().toISOString(),
  };
}

export function useFlows() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["user_flows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("user_flows" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false }) as any);
      if (error) throw error;
      return ((data ?? []) as DbFlow[]).map(dbToSavedFlow);
    },
  });

  const saveFlow = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      nodes: unknown[];
      edges: unknown[];
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const triggerNode = (payload.nodes as any[]).find(
        (n: any) => n.data?.category === "trigger" || n.data?.nodeType?.startsWith("trigger_")
      );

      const dbPayload = {
        user_id: user.id,
        name: payload.name,
        description: payload.description || `${payload.nodes.length} blocos`,
        nodes: payload.nodes,
        edges: payload.edges,
        is_active: false,
        trigger_type: triggerNode?.data?.nodeType ?? "manual",
        trigger_config: {},
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { data, error } = await (supabase
          .from("user_flows" as any)
          .update(dbPayload)
          .eq("id", payload.id)
          .select()
          .single() as any);
        if (error) throw error;
        return data as DbFlow;
      } else {
        const { data, error } = await (supabase
          .from("user_flows" as any)
          .insert(dbPayload)
          .select()
          .single() as any);
        if (error) throw error;
        return data as DbFlow;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_flows"] });
    },
  });

  const toggleFlow = useMutation({
    mutationFn: async ({ flowId, isActive }: { flowId: string; isActive: boolean }) => {
      const { error } = await (supabase
        .from("user_flows" as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", flowId) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_flows"] }),
  });

  const deleteFlow = useMutation({
    mutationFn: async (flowId: string) => {
      const { error } = await (supabase
        .from("user_flows" as any)
        .delete()
        .eq("id", flowId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_flows"] });
      toast.success("Fluxo excluído");
    },
  });

  return { flows, isLoading, saveFlow, toggleFlow, deleteFlow };
}
