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

// ──────────────────────────────────────────────────────────────────────────
// Sprint 2.5-b — Ingestion
// ──────────────────────────────────────────────────────────────────────────
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";

type IngestTextPayload = {
  kb_id: string;
  source_type: "text";
  title: string;
  raw_content: string;
};

type IngestFaqPayload = {
  kb_id: string;
  source_type: "faq";
  title: string;
  faqs: Array<{ question: string; answer: string }>;
};

type IngestFilePayload = {
  kb_id: string;
  source_type: "file";
  title: string;
  storage_path: string;
};

type IngestUrlPayload = {
  kb_id: string;
  source_type: "url";
  title: string;
  url: string;
};

export type IngestPayload =
  | IngestTextPayload
  | IngestFaqPayload
  | IngestFilePayload
  | IngestUrlPayload;

const KB_ALLOWED_EXTS = ["txt", "md", "pdf", "docx"] as const;
const KB_MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function uploadKbFile(
  agentId: string,
  file: File,
): Promise<{ storage_path: string }> {
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      return resp.json() as Promise<{
        success: true;
        document_id: string;
        chunks_count: number;
        total_tokens: number;
        elapsed_ms: number;
      }>;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kb-documents", vars.kb_id] });
      queryClient.invalidateQueries({ queryKey: ["agent-kbs"] });
      toast.success(`Documento processado: ${data.chunks_count} chunks gerados`);
    },
    onError: (err) => {
      toast.error(`Falha na ingestão: ${(err as Error).message}`);
    },
  });
}
