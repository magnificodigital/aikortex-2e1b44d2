
-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Reunião',
  room_id TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  host_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  settings JSONB NOT NULL DEFAULT '{
    "waiting_room": false,
    "chat_enabled": true,
    "screen_share_enabled": true
  }'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting participants table
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('waiting', 'joined', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting chat messages table
CREATE TABLE public.meeting_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

-- Meetings policies
CREATE POLICY "Authenticated users can create meetings"
ON public.meetings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Authenticated users can view meetings"
ON public.meetings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Host can update their meetings"
ON public.meetings FOR UPDATE TO authenticated
USING (auth.uid() = host_user_id);

CREATE POLICY "Host can delete their meetings"
ON public.meetings FOR DELETE TO authenticated
USING (auth.uid() = host_user_id);

-- Participants policies
CREATE POLICY "Authenticated users can view participants"
ON public.meeting_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can join meetings"
ON public.meeting_participants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.meeting_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Participants can view messages"
ON public.meeting_messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON public.meeting_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messages and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;

-- Add updated_at trigger for meetings
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
