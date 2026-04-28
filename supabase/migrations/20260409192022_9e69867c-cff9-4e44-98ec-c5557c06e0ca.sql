
-- Flow executions
CREATE TABLE public.flow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flow_id text NOT NULL,
  flow_name text,
  status text NOT NULL DEFAULT 'running',
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_data jsonb DEFAULT '{}',
  context jsonb DEFAULT '{}',
  current_node_id text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_flow_execution_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('running','completed','failed','paused') THEN
    RAISE EXCEPTION 'Invalid flow execution status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_flow_execution_status_trigger
  BEFORE INSERT OR UPDATE ON public.flow_executions
  FOR EACH ROW EXECUTE FUNCTION public.validate_flow_execution_status();

CREATE OR REPLACE FUNCTION public.validate_flow_execution_trigger_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.trigger_type NOT IN ('manual','whatsapp','webhook','schedule','flow') THEN
    RAISE EXCEPTION 'Invalid trigger type: %', NEW.trigger_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_flow_execution_trigger_type_trigger
  BEFORE INSERT OR UPDATE ON public.flow_executions
  FOR EACH ROW EXECUTE FUNCTION public.validate_flow_execution_trigger_type();

ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own executions"
  ON public.flow_executions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on flow_executions"
  ON public.flow_executions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Flow node logs
CREATE TABLE public.flow_node_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  node_label text,
  status text NOT NULL DEFAULT 'running',
  input jsonb DEFAULT '{}',
  output jsonb DEFAULT '{}',
  agent_session_id text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

CREATE OR REPLACE FUNCTION public.validate_flow_node_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('running','completed','failed','skipped') THEN
    RAISE EXCEPTION 'Invalid node log status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_flow_node_log_status_trigger
  BEFORE INSERT OR UPDATE ON public.flow_node_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_flow_node_log_status();

ALTER TABLE public.flow_node_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs"
  ON public.flow_node_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.flow_executions WHERE id = execution_id AND user_id = auth.uid())
  );

CREATE POLICY "Service role full access on flow_node_logs"
  ON public.flow_node_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- User flows
CREATE TABLE public.user_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  nodes jsonb NOT NULL DEFAULT '[]',
  edges jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT false,
  trigger_type text DEFAULT 'manual',
  trigger_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flows"
  ON public.user_flows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_flows_updated_at
  BEFORE UPDATE ON public.user_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
