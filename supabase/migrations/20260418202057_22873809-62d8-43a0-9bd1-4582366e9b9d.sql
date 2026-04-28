
-- 1) Restrict meetings SELECT to host or participants only
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;

CREATE POLICY "Host or participants can view meetings"
ON public.meetings
FOR SELECT
TO authenticated
USING (
  host_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = meetings.id AND mp.user_id = auth.uid()
  )
);

-- 2) Make call-audio bucket private and add owner-scoped SELECT policy
UPDATE storage.buckets SET public = false WHERE id = 'call-audio';

DROP POLICY IF EXISTS "Public can read call audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view call audio" ON storage.objects;
DROP POLICY IF EXISTS "Call audio public access" ON storage.objects;

CREATE POLICY "Users read their own call audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role manages call audio"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'call-audio')
WITH CHECK (bucket_id = 'call-audio');
