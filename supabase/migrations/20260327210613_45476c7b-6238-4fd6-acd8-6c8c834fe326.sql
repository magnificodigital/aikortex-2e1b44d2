
CREATE TABLE public.user_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agent_type text NOT NULL DEFAULT 'Custom',
  name text NOT NULL,
  description text DEFAULT '',
  avatar_url text DEFAULT '',
  model text DEFAULT 'gemini-2.5-flash',
  status text NOT NULL DEFAULT 'configuring',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agents"
  ON public.user_agents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_agents_updated_at
  BEFORE UPDATE ON public.user_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
