
CREATE TABLE IF NOT EXISTS public.broadcast_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broadcast_name text,
  total_contacts integer DEFAULT 0,
  sent integer DEFAULT 0,
  failed integer DEFAULT 0,
  use_ai boolean DEFAULT false,
  agent_id uuid,
  channel text DEFAULT 'whatsapp',
  status text DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_broadcast_log_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('running','completed','failed') THEN
    RAISE EXCEPTION 'Invalid broadcast status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_broadcast_log_status_trigger
BEFORE INSERT OR UPDATE ON public.broadcast_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_broadcast_log_status();

ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own broadcasts" ON public.broadcast_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on broadcast_logs" ON public.broadcast_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
