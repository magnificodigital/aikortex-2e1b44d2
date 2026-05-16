
CREATE TABLE public.agent_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual','auto')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, name)
);

CREATE INDEX idx_agent_cadences_agent_enabled
  ON public.agent_cadences (agent_id, enabled) WHERE enabled = true;

CREATE TRIGGER set_agent_cadences_updated_at
  BEFORE UPDATE ON public.agent_cadences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cadence_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id uuid NOT NULL REFERENCES public.agent_cadences(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  contact_phone text,
  contact_name text,
  contact_metadata jsonb DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','paused','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  next_run_at timestamptz,
  completed_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cadence_executions_status_next_run
  ON public.cadence_executions (status, next_run_at)
  WHERE status IN ('pending','running');

CREATE INDEX idx_cadence_executions_cadence
  ON public.cadence_executions (cadence_id);

CREATE TRIGGER set_cadence_executions_updated_at
  BEFORE UPDATE ON public.cadence_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agent_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_cadences_select_own"
  ON public.agent_cadences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_cadences.agent_id AND user_agents.user_id = auth.uid()));

CREATE POLICY "agent_cadences_write_own"
  ON public.agent_cadences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_cadences.agent_id AND user_agents.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_id AND user_agents.user_id = auth.uid()));

CREATE POLICY "cadence_executions_select_own"
  ON public.cadence_executions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_agents
    WHERE user_agents.id = cadence_executions.agent_id AND user_agents.user_id = auth.uid()));

CREATE POLICY "cadence_executions_write_own"
  ON public.cadence_executions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_agents
    WHERE user_agents.id = cadence_executions.agent_id AND user_agents.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_id AND user_agents.user_id = auth.uid()));

CREATE POLICY "agent_cadences_service_role"
  ON public.agent_cadences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "cadence_executions_service_role"
  ON public.cadence_executions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
