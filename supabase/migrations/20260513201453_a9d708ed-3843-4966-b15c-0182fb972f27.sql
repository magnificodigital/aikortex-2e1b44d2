-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- agent_knowledge_bases
-- ============================================================
CREATE TABLE public.agent_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  embedding_model TEXT NOT NULL DEFAULT 'openai/text-embedding-3-small',
  embedding_dim INTEGER NOT NULL DEFAULT 1536,
  chunk_size INTEGER NOT NULL DEFAULT 800,
  chunk_overlap INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, name)
);

CREATE INDEX idx_agent_knowledge_bases_agent_id ON public.agent_knowledge_bases(agent_id);

ALTER TABLE public.agent_knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their KBs"
  ON public.agent_knowledge_bases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_agents ua WHERE ua.id = agent_id AND ua.user_id = auth.uid()));

CREATE POLICY "Owners can insert KBs"
  ON public.agent_knowledge_bases FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_agents ua WHERE ua.id = agent_id AND ua.user_id = auth.uid()));

CREATE POLICY "Owners can update their KBs"
  ON public.agent_knowledge_bases FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_agents ua WHERE ua.id = agent_id AND ua.user_id = auth.uid()));

CREATE POLICY "Owners can delete their KBs"
  ON public.agent_knowledge_bases FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_agents ua WHERE ua.id = agent_id AND ua.user_id = auth.uid()));

CREATE POLICY "Service role full access KBs"
  ON public.agent_knowledge_bases FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_agent_knowledge_bases_updated_at
  BEFORE UPDATE ON public.agent_knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- kb_documents
-- ============================================================
CREATE TABLE public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES public.agent_knowledge_bases(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_uri TEXT,
  title TEXT,
  raw_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_documents_kb_id ON public.kb_documents(knowledge_base_id);
CREATE INDEX idx_kb_documents_status ON public.kb_documents(status);

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their KB documents"
  ON public.kb_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agent_knowledge_bases akb
    JOIN public.user_agents ua ON ua.id = akb.agent_id
    WHERE akb.id = knowledge_base_id AND ua.user_id = auth.uid()
  ));

CREATE POLICY "Owners can insert KB documents"
  ON public.kb_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_knowledge_bases akb
    JOIN public.user_agents ua ON ua.id = akb.agent_id
    WHERE akb.id = knowledge_base_id AND ua.user_id = auth.uid()
  ));

CREATE POLICY "Owners can update their KB documents"
  ON public.kb_documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agent_knowledge_bases akb
    JOIN public.user_agents ua ON ua.id = akb.agent_id
    WHERE akb.id = knowledge_base_id AND ua.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their KB documents"
  ON public.kb_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agent_knowledge_bases akb
    JOIN public.user_agents ua ON ua.id = akb.agent_id
    WHERE akb.id = knowledge_base_id AND ua.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access KB documents"
  ON public.kb_documents FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_kb_documents_updated_at
  BEFORE UPDATE ON public.kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- kb_chunks
-- ============================================================
CREATE TABLE public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES public.agent_knowledge_bases(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_kb_chunks_document_id ON public.kb_chunks(document_id);
CREATE INDEX idx_kb_chunks_kb_id ON public.kb_chunks(knowledge_base_id);
CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their KB chunks"
  ON public.kb_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agent_knowledge_bases akb
    JOIN public.user_agents ua ON ua.id = akb.agent_id
    WHERE akb.id = knowledge_base_id AND ua.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their KB chunks"
  ON public.kb_chunks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agent_knowledge_bases akb
    JOIN public.user_agents ua ON ua.id = akb.agent_id
    WHERE akb.id = knowledge_base_id AND ua.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access KB chunks"
  ON public.kb_chunks FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- match_kb_chunks RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  p_agent_id UUID,
  p_query_embedding vector(1536),
  p_match_count INTEGER DEFAULT 5,
  p_min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  knowledge_base_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_agents ua
    WHERE ua.id = p_agent_id
      AND (ua.user_id = auth.uid() OR auth.role() = 'service_role')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para consultar este agente.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.knowledge_base_id,
    c.content,
    (1 - (c.embedding <=> p_query_embedding))::float AS similarity,
    c.metadata
  FROM public.kb_chunks c
  JOIN public.agent_knowledge_bases akb ON akb.id = c.knowledge_base_id
  WHERE akb.agent_id = p_agent_id
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_kb_chunks(UUID, vector, INTEGER, FLOAT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_kb_chunks(UUID, vector, INTEGER, FLOAT) TO authenticated, service_role;

-- ============================================================
-- kb-files storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('kb-files', 'kb-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners can read their KB files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kb-files'
    AND EXISTS (
      SELECT 1 FROM public.user_agents ua
      WHERE ua.id::text = (storage.foldername(name))[1]
        AND ua.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can upload their KB files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kb-files'
    AND EXISTS (
      SELECT 1 FROM public.user_agents ua
      WHERE ua.id::text = (storage.foldername(name))[1]
        AND ua.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their KB files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kb-files'
    AND EXISTS (
      SELECT 1 FROM public.user_agents ua
      WHERE ua.id::text = (storage.foldername(name))[1]
        AND ua.user_id = auth.uid()
    )
  );