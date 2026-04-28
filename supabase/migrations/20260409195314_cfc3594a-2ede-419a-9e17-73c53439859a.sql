
CREATE TABLE public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Geral',
  icon_name text NOT NULL DEFAULT 'BookOpen',
  read_time text NOT NULL DEFAULT '5 min',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active articles"
  ON public.help_articles FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins full access"
  ON public.help_articles FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
