
-- Add video and collection support to help_articles
ALTER TABLE public.help_articles
  ADD COLUMN IF NOT EXISTS video_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS article_type text NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS collection text NOT NULL DEFAULT 'Geral';

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  admin_reply text,
  admin_replied_at timestamptz,
  admin_replied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins full access on tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for ticket status
CREATE OR REPLACE FUNCTION public.validate_support_ticket_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','in_progress','resolved','closed') THEN
    RAISE EXCEPTION 'Invalid ticket status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_support_ticket_status_trigger
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket_status();

-- Validation for article_type
CREATE OR REPLACE FUNCTION public.validate_help_article_type()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.article_type NOT IN ('article','video','faq') THEN
    RAISE EXCEPTION 'Invalid article type: %', NEW.article_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_help_article_type_trigger
  BEFORE INSERT OR UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.validate_help_article_type();
