
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for type
CREATE OR REPLACE FUNCTION public.validate_notification_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'Invalid notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_notification_type_trigger
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_notification_type();

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
