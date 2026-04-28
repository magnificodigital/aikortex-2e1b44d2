
CREATE TABLE public.meeting_waiting_room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  guest_id text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_waiting_room ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (guest requesting entry)
CREATE POLICY "Anyone can request entry" ON public.meeting_waiting_room
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Anyone can read waiting room entries for a meeting they know the room_id of
CREATE POLICY "Anyone can read waiting room" ON public.meeting_waiting_room
  FOR SELECT TO anon, authenticated USING (true);

-- Only host can update (approve/reject)
CREATE POLICY "Host can update waiting room" ON public.meeting_waiting_room
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_waiting_room.meeting_id
      AND m.host_user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_waiting_room;
