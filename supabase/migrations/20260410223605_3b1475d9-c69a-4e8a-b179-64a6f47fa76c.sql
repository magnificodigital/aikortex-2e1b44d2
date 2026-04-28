
-- Call logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.user_agents(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outbound',
  channel text NOT NULL DEFAULT 'browser',
  phone_from text,
  phone_to text,
  duration_seconds integer DEFAULT 0,
  status text DEFAULT 'initiated',
  transcript jsonb DEFAULT '[]',
  recording_url text,
  telnyx_call_id text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users manage own call logs"
  ON public.call_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on call_logs"
  ON public.call_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Validation triggers for call_logs
CREATE OR REPLACE FUNCTION public.validate_call_log_direction()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.direction NOT IN ('inbound','outbound') THEN
    RAISE EXCEPTION 'Invalid call direction: %', NEW.direction;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_call_log_direction
  BEFORE INSERT OR UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_call_log_direction();

CREATE OR REPLACE FUNCTION public.validate_call_log_channel()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.channel NOT IN ('browser','phone') THEN
    RAISE EXCEPTION 'Invalid call channel: %', NEW.channel;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_call_log_channel
  BEFORE INSERT OR UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_call_log_channel();

CREATE OR REPLACE FUNCTION public.validate_call_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('initiated','ringing','in_progress','completed','failed','no_answer') THEN
    RAISE EXCEPTION 'Invalid call status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_call_log_status
  BEFORE INSERT OR UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_call_log_status();

-- Voice config columns on user_agents
ALTER TABLE public.user_agents
  ADD COLUMN IF NOT EXISTS voice_provider text DEFAULT 'elevenlabs',
  ADD COLUMN IF NOT EXISTS voice_id text,
  ADD COLUMN IF NOT EXISTS voice_language text DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS voice_stability float DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS voice_similarity float DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS telnyx_phone_number text,
  ADD COLUMN IF NOT EXISTS call_webhook_url text,
  ADD COLUMN IF NOT EXISTS max_call_duration_seconds integer DEFAULT 300;
