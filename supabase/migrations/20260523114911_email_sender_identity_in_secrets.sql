-- Sprint 2.7-b1 final: move identidade do remetente de email
-- de cadence_steps (JSONB) para agency_secrets (canal de disparo)
--
-- Motivação: from_name e reply_to são identidade da agência, não conteúdo editorial
-- por step. Configurar uma vez por agência (em Integrações → Email) e usar em todas
-- as cadências. Subject continua per-step (é conteúdo).

ALTER TABLE public.agency_secrets
  ADD COLUMN IF NOT EXISTS default_from_name text,
  ADD COLUMN IF NOT EXISTS default_reply_to text;

-- Atualiza RPC pra expor os novos campos no status
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
  v_from_name text;
  v_reply_to text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id, COALESCE(email_trial_used, 0)
    INTO v_agency_id, v_trial_used
    FROM public.agency_profiles
    WHERE user_id = v_user
    LIMIT 1;

  SELECT resend_api_key, resend_from_email, default_from_name, default_reply_to
    INTO v_api_key, v_from, v_from_name, v_reply_to
    FROM public.agency_secrets
    WHERE agency_user_id = v_user
    LIMIT 1;

  RETURN jsonb_build_object(
    'agency_id', v_agency_id,
    'connected', (v_api_key IS NOT NULL AND length(v_api_key) > 0),
    'from_email', v_from,
    'from_name', v_from_name,
    'reply_to', v_reply_to,
    'api_key_suffix', CASE WHEN v_api_key IS NOT NULL AND length(v_api_key) >= 4
                            THEN right(v_api_key, 4) ELSE NULL END,
    'trial_used', COALESCE(v_trial_used, 0),
    'trial_remaining', GREATEST(0, 100 - COALESCE(v_trial_used, 0))
  );
END;
$$;
