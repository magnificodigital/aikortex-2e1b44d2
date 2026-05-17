ALTER TABLE public.agency_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_secrets_select_own" ON public.agency_secrets
  FOR SELECT TO authenticated
  USING (agency_user_id = auth.uid());

CREATE POLICY "agency_secrets_insert_own" ON public.agency_secrets
  FOR INSERT TO authenticated
  WITH CHECK (agency_user_id = auth.uid());

CREATE POLICY "agency_secrets_update_own" ON public.agency_secrets
  FOR UPDATE TO authenticated
  USING (agency_user_id = auth.uid())
  WITH CHECK (agency_user_id = auth.uid());