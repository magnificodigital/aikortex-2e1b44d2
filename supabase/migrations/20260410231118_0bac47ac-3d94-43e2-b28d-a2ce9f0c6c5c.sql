
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  call_control_id text UNIQUE NOT NULL,
  agent_id uuid REFERENCES public.user_agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on call_sessions" ON public.call_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
