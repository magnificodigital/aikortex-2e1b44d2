CREATE TABLE IF NOT EXISTS public.agency_monthly_usage (
  agency_id  uuid  NOT NULL,
  year_month text  NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, year_month)
);

ALTER TABLE public.agency_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_read_own_usage"
  ON public.agency_monthly_usage FOR SELECT TO authenticated
  USING (agency_id = (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()));

CREATE POLICY "service_role_all"
  ON public.agency_monthly_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.increment_agency_usage(p_agency_id uuid, p_year_month text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.agency_monthly_usage (agency_id, year_month, message_count)
  VALUES (p_agency_id, p_year_month, 1)
  ON CONFLICT (agency_id, year_month)
  DO UPDATE SET
    message_count = agency_monthly_usage.message_count + 1,
    updated_at    = now()
  RETURNING message_count INTO v_count;
  RETURN v_count;
END;
$$;