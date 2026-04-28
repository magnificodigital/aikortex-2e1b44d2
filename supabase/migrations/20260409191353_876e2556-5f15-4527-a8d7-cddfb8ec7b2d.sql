
-- Table for agent memory stores
CREATE TABLE public.agent_memory_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  anthropic_memory_store_id text UNIQUE,
  name text NOT NULL DEFAULT 'Memória principal',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id)
);

ALTER TABLE public.agent_memory_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory stores"
  ON public.agent_memory_stores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on memory stores"
  ON public.agent_memory_stores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_agent_memory_stores_updated_at
  BEFORE UPDATE ON public.agent_memory_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
