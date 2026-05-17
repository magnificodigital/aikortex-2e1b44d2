
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Colunas
ALTER TABLE public.agency_secrets
  ADD COLUMN IF NOT EXISTS resend_api_key text,
  ADD COLUMN IF NOT EXISTS resend_from_email text;

ALTER TABLE public.agency_monthly_usage
  ADD COLUMN IF NOT EXISTS emails_sent integer NOT NULL DEFAULT 0;

ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS email_trial_used integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.agency_profiles.email_trial_used IS
  'Emails consumidos do trial gratuito (100 emails via Resend Aikortex). Após esgotar, agência precisa conectar Resend própria.';

-- RPC: incrementa trial (service_role)
CREATE OR REPLACE FUNCTION public.increment_email_trial(p_agency_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
BEGIN
  UPDATE public.agency_profiles
    SET email_trial_used = email_trial_used + 1, updated_at = now()
    WHERE id = p_agency_id
    RETURNING email_trial_used INTO v_used;
  RETURN v_used;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_email_trial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_email_trial(uuid) TO service_role;

-- RPC: status da integração (próprio usuário)
CREATE OR REPLACE FUNCTION public.get_email_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_agency_id uuid;
  v_trial_used integer;
  v_api_key text;
  v_from text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id, COALESCE(email_trial_used, 0)
    INTO v_agency_id, v_trial_used
    FROM public.agency_profiles
    WHERE user_id = v_user
    LIMIT 1;

  SELECT resend_api_key, resend_from_email
    INTO v_api_key, v_from
    FROM public.agency_secrets
    WHERE agency_user_id = v_user
    LIMIT 1;

  RETURN jsonb_build_object(
    'agency_id', v_agency_id,
    'connected', (v_api_key IS NOT NULL AND length(v_api_key) > 0),
    'from_email', v_from,
    'api_key_suffix', CASE WHEN v_api_key IS NOT NULL AND length(v_api_key) >= 4
                            THEN right(v_api_key, 4) ELSE NULL END,
    'trial_used', COALESCE(v_trial_used, 0),
    'trial_remaining', GREATEST(0, 100 - COALESCE(v_trial_used, 0))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_email_integration_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_integration_status() TO authenticated;

-- pg_cron: roda a cada 5 min
DO $$
DECLARE
  v_existing_jobid bigint;
BEGIN
  SELECT jobid INTO v_existing_jobid FROM cron.job WHERE jobname = 'cadence-runner';
  IF v_existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'cadence-runner',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://jcahtniqqiaefszhgpqx.supabase.co/functions/v1/send-cadence-step',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYWh0bmlxcWlhZWZzemhncHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDU0NzMsImV4cCI6MjA5Mjk4MTQ3M30.PI5aN2FW0mIuO5mJSTlo3VlTG0geZ6cCk4n2l8DR1_4'
    ),
    body := jsonb_build_object('execution_id', ce.id)
  )
  FROM public.cadence_executions ce
  WHERE ce.status = 'pending'
    AND ce.next_run_at IS NOT NULL
    AND ce.next_run_at <= now()
  LIMIT 50;
  $cron$
);
