
-- 1) agency_profiles: protect asaas_api_key + add boolean indicator
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS asaas_connected boolean
  GENERATED ALWAYS AS (asaas_api_key IS NOT NULL) STORED;

REVOKE SELECT (asaas_api_key) ON public.agency_profiles FROM anon, authenticated, public;
REVOKE UPDATE (asaas_api_key) ON public.agency_profiles FROM anon, authenticated, public;
REVOKE INSERT (asaas_api_key) ON public.agency_profiles FROM anon, authenticated, public;

-- 2) agency_wallets: remove user self-update of balance
DROP POLICY IF EXISTS "Users can update own wallet" ON public.agency_wallets;

-- 3) call_sessions: allow users to read their own sessions
CREATE POLICY "Users view own call sessions"
  ON public.call_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) meeting_waiting_room: restrict SELECT to host only (insert remains for guests)
DROP POLICY IF EXISTS "Anyone can read waiting room" ON public.meeting_waiting_room;

CREATE POLICY "Host views waiting room"
  ON public.meeting_waiting_room FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_waiting_room.meeting_id
      AND m.host_user_id = auth.uid()
  ));

-- 5) storage: enforce per-user path for agent-avatars uploads
DROP POLICY IF EXISTS "Authenticated users can upload agent avatars" ON storage.objects;

CREATE POLICY "Users upload own agent avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'agent-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6) agency_rate_limits: explicit service_role access policy
CREATE POLICY "Service role manages rate limits"
  ON public.agency_rate_limits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 7) Revoke EXECUTE on sensitive SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.increment_monthly_usage(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.add_to_wallet_consumed(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, timestamptz, integer) FROM anon, authenticated, public;
