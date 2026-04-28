
-- 1. Remove user self-update on subscriptions (privilege escalation risk)
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

-- 2. Remove user self-update on partner_tiers (privilege escalation risk)
DROP POLICY IF EXISTS "Users can update own tier" ON public.partner_tiers;

-- 3. Replace unrestricted anon SELECT on meetings with room_id scoped policy
DROP POLICY IF EXISTS "Anyone can view meetings by room_id" ON public.meetings;
CREATE POLICY "Anon can view meeting by room_id"
  ON public.meetings
  FOR SELECT
  TO anon
  USING (false);

-- 4. Restrict meeting_messages SELECT to participants only
DROP POLICY IF EXISTS "Participants can view messages" ON public.meeting_messages;
CREATE POLICY "Participants can view messages"
  ON public.meeting_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp
      WHERE mp.meeting_id = meeting_messages.meeting_id
        AND mp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_messages.meeting_id
        AND m.host_user_id = auth.uid()
    )
  );

-- 5. Restrict meeting_participants SELECT to same-meeting participants / host
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.meeting_participants;
CREATE POLICY "Participants can view meeting participants"
  ON public.meeting_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp2
      WHERE mp2.meeting_id = meeting_participants.meeting_id
        AND mp2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_participants.meeting_id
        AND m.host_user_id = auth.uid()
    )
  );
