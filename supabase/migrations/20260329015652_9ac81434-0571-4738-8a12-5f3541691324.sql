CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wamid text,
  from_number text NOT NULL,
  to_number text,
  phone_number_id text,
  contact_name text,
  message_type text NOT NULL DEFAULT 'text',
  content text NOT NULL DEFAULT '',
  raw_payload jsonb DEFAULT '{}',
  direction text NOT NULL DEFAULT 'incoming',
  status text NOT NULL DEFAULT 'received',
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  app_id uuid REFERENCES public.user_apps(id) ON DELETE SET NULL,
  user_id uuid
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert messages"
  ON public.whatsapp_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.whatsapp_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_whatsapp_messages_from ON public.whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_app ON public.whatsapp_messages(app_id);
CREATE INDEX idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);