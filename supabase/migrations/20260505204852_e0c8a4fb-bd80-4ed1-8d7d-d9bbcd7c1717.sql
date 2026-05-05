
-- 1) credit_transactions: remove user INSERT (only service_role / platform admin can write)
DROP POLICY IF EXISTS "Users insert own transactions" ON public.credit_transactions;

-- 2) meeting_waiting_room: validate meeting exists and isn't ended
DROP POLICY IF EXISTS "Anyone can request entry" ON public.meeting_waiting_room;
CREATE POLICY "Anyone can request entry"
  ON public.meeting_waiting_room
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_waiting_room.meeting_id
        AND m.status <> 'ended'
    )
  );

-- 3) Restrict public listing of agent-avatars bucket: keep direct file reads, drop list-all SELECT
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname IN ('Public read agent-avatars','Anyone can view agent-avatars','Public can view agent avatars','Agent avatars are publicly accessible')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;
