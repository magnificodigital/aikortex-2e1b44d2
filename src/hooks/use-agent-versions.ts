import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentVersion {
  id: string;
  agent_id: string;
  version_number: number;
  config_snapshot: Record<string, any>;
  label: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export function useAgentVersions(agentId?: string) {
  return useQuery({
    queryKey: ["agent-versions", agentId],
    enabled: !!agentId,
    queryFn: async (): Promise<AgentVersion[]> => {
      const { data, error } = await (supabase as any)
        .from("agent_versions")
        .select("*")
        .eq("agent_id", agentId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgentVersion[];
    },
  });
}

export function useAgentPublishState(agentId?: string) {
  return useQuery({
    queryKey: ["agent-publish-state", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_agents")
        .select("published_version_id, draft_updated_at, config")
        .eq("id", agentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let publishedSnapshot: Record<string, any> | null = null;
      let publishedNumber: number | null = null;
      if (data.published_version_id) {
        const { data: v } = await (supabase as any)
          .from("agent_versions")
          .select("config_snapshot, version_number")
          .eq("id", data.published_version_id)
          .maybeSingle();
        publishedSnapshot = v?.config_snapshot ?? null;
        publishedNumber = v?.version_number ?? null;
      }
      return {
        publishedVersionId: data.published_version_id as string | null,
        publishedSnapshot,
        publishedNumber,
        draftUpdatedAt: data.draft_updated_at as string | null,
        currentConfig: data.config as Record<string, any>,
      };
    },
  });
}

export function usePublishAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, label, notes }: { agentId: string; label?: string; notes?: string }) => {
      const { data, error } = await (supabase as any).rpc("publish_agent_version", {
        p_agent_id: agentId,
        p_label: label || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data as { version_id: string; version_number: number };
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-versions", vars.agentId] });
      qc.invalidateQueries({ queryKey: ["agent-publish-state", vars.agentId] });
      toast.success(`Agente publicado como v${data.version_number}`);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Falha ao publicar agente");
    },
  });
}

export function useRestoreAgentVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, version }: { agentId: string; version: AgentVersion }) => {
      const { error } = await (supabase as any)
        .from("user_agents")
        .update({ config: version.config_snapshot })
        .eq("id", agentId);
      if (error) throw error;
      return version;
    },
    onSuccess: (v, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-publish-state", vars.agentId] });
      qc.invalidateQueries({ queryKey: ["user-agents"] });
      toast.success(`Rascunho restaurado a partir da v${v.version_number}`);
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao restaurar versão"),
  });
}

export function useUpdateVersionLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ versionId, agentId, label, notes }: { versionId: string; agentId: string; label?: string | null; notes?: string | null }) => {
      const patch: Record<string, any> = {};
      if (label !== undefined) patch.label = label;
      if (notes !== undefined) patch.notes = notes;
      const { error } = await (supabase as any).from("agent_versions").update(patch).eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-versions", vars.agentId] });
    },
  });
}
