
-- Allow anonymous users to view meetings (for public links)
CREATE POLICY "Anyone can view meetings by room_id"
ON public.meetings
FOR SELECT
TO anon
USING (true);
