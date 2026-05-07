
-- Lock down realtime.messages so only authenticated users with proper context can subscribe
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_realtime_access" ON realtime.messages;

CREATE POLICY "authenticated_realtime_access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Host-only waiting room broadcast channel: host-waiting-<meetingId>
  (
    realtime.topic() LIKE 'host-waiting-%'
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.host_user_id = auth.uid()
        AND m.id::text = substring(realtime.topic() from 'host-waiting-(.*)')
    )
  )
  -- Guest waiting channel (guest-scoped, not sensitive cross-user)
  OR realtime.topic() LIKE 'waiting-%'
  -- Postgres changes streams: row visibility still gated by underlying table RLS
  OR realtime.topic() LIKE 'realtime:%'
);

CREATE POLICY "authenticated_realtime_send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'host-waiting-%'
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.host_user_id = auth.uid()
        AND m.id::text = substring(realtime.topic() from 'host-waiting-(.*)')
    )
  )
  OR realtime.topic() LIKE 'waiting-%'
  OR realtime.topic() LIKE 'realtime:%'
);
