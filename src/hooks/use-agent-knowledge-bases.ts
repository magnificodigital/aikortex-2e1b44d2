import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";

export interface AgentKnowledgeBase {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  embedding_model: string;
  embedding_dim: number;
  chunk_size: number;
  chunk_overlap: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledge_base_id: string;
  source_type: "text" | "faq" | "file" | "url";
  source_uri: string | null;
  title: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  metadata: Record<string, any>;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  chunks_count: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Legacy read-only hook (kept for backward compat)
// ──────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────
// React-Query hooks (Sprint 2.5-d)
// ──────────────────────────────────────────────────────────────────────────
export function useAgentKbs(agentId: string | null | undefined) {
  return useQuery({
    queryKey: ["agent-kbs", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("agent_knowledge_bases" as any)
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true }) as any);
      if (error) throw error;
      return (data as AgentKnowledgeBase[]) || [];
    },
  });
}

export function useKnowledgeDocuments(kbId: string | null | undefined) {
  return useQuery({
    queryKey: ["kb-documents", kbId],
    enabled: !!kbId,
    refetchInterval: (query) => {
      const data = query.state.data as KnowledgeDocument[] | undefined;
      const hasPending = data?.some((d) => d.status === "processing" || d.status === "pending");
      return hasPending ? 2500 : false;
    },
    queryFn: async () => {
      if (!kbId) return [] as KnowledgeDocument[];
      const { data, error } = await (supabase
        .from("kb_documents" as any)
        .select("*, chunks_count:kb_chunks(count)")
        .eq("knowledge_base_id", kbId)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return ((data as any[]) || []).map((d: any) => ({
        ...d,
        chunks_count: Array.isArray(d.chunks_count) ? d.chunks_count[0]?.count ?? 0 : 0,
      })) as KnowledgeDocument[];
    },
  });
}

export function useCreateKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { agent_id: string; name: string; description?: string }) => {
      const { data, error } = await (supabase
        .from("agent_knowledge_bases" as any)
        .insert({ agent_id: vars.agent_id, name: vars.name, description: vars.description ?? null })
        .select()
        .single() as any);
      if (error) throw error;
      return data as AgentKnowledgeBase;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-kbs", vars.agent_id] });
      toast.success("Base de conhecimento criada");
    },
    onError: (err) => toast.error(`Falha ao criar: ${(err as Error).message}`),
  });
}

export function useUpdateKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; agent_id: string; patch: Partial<Pick<AgentKnowledgeBase, "name" | "description" | "enabled">> }) => {
      const { error } = await (supabase
        .from("agent_knowledge_bases" as any)
        .update(vars.patch)
        .eq("id", vars.id) as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-kbs", vars.agent_id] });
    },
    onError: (err) => toast.error(`Falha ao atualizar: ${(err as Error).message}`),
  });
}

export function useDeleteKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { kb_id: string; agent_id: string }) => {
      const { data: docs } = await (supabase
        .from("kb_documents" as any)
        .select("id, source_type, source_uri")
        .eq("knowledge_base_id", vars.kb_id)
        .eq("source_type", "file") as any);
      const paths = ((docs as any[]) || []).map((d) => d.source_uri).filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("kb-files").remove(paths);
      }
      const { error } = await (supabase
        .from("agent_knowledge_bases" as any)
        .delete()
        .eq("id", vars.kb_id) as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["agent-kbs", vars.agent_id] });
      toast.success("Base excluída");
    },
    onError: (err) => toast.error(`Falha ao excluir: ${(err as Error).message}`),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { doc_id: string; kb_id: string }) => {
      const { data: doc } = await (supabase
        .from("kb_documents" as any)
        .select("source_type, source_uri")
        .eq("id", vars.doc_id)
        .single() as any);
      if (doc && (doc as any).source_type === "file" && (doc as any).source_uri) {
        await supabase.storage.from("kb-files").remove([(doc as any).source_uri]);
      }
      const { error } = await (supabase
        .from("kb_documents" as any)
        .delete()
        .eq("id", vars.doc_id) as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["kb-documents", vars.kb_id] });
      qc.invalidateQueries({ queryKey: ["agent-kbs"] });
      toast.success("Documento removido");
    },
    onError: (err) => toast.error(`Falha ao remover: ${(err as Error).message}`),
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Ingestion (Sprint 2.5-b/c)
// ──────────────────────────────────────────────────────────────────────────
type IngestTextPayload = { kb_id: string; source_type: "text"; title: string; raw_content: string };
type IngestFaqPayload = { kb_id: string; source_type: "faq"; title: string; faqs: Array<{ question: string; answer: string }> };
type IngestFilePayload = { kb_id: string; source_type: "file"; title: string; storage_path: string };
type IngestUrlPayload = { kb_id: string; source_type: "url"; title: string; url: string };
export type IngestPayload = IngestTextPayload | IngestFaqPayload | IngestFilePayload | IngestUrlPayload;

const KB_ALLOWED_EXTS = ["txt", "md", "pdf", "docx"] as const;
const KB_MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function uploadKbFile(agentId: string, file: File): Promise<{ storage_path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  if (!KB_ALLOWED_EXTS.includes(ext as any)) {
    throw new Error(`Tipo de arquivo não suportado: .${ext}. Aceitos: ${KB_ALLOWED_EXTS.join(", ")}`);
  }
  if (file.size > KB_MAX_FILE_BYTES) {
    throw new Error(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB (máx 10MB)`);
  }
  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const storagePath = `${agentId}/${uuid}-${safeName}`;
  const { error } = await supabase.storage.from("kb-files").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Upload falhou: ${error.message}`);
  return { storage_path: storagePath };
}

export function useIngestDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: IngestPayload) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      const resp = await fetch(fnUrl("ingest-document"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      return resp.json() as Promise<{
        success: true; document_id: string; chunks_count: number; total_tokens: number; elapsed_ms: number;
      }>;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", vars.kb_id] });
      queryClient.invalidateQueries({ queryKey: ["agent-kbs"] });
      toast.success(`Documento processado: ${data.chunks_count} chunks gerados`);
    },
    onError: (err) => toast.error(`Falha na ingestão: ${(err as Error).message}`),
  });
}
