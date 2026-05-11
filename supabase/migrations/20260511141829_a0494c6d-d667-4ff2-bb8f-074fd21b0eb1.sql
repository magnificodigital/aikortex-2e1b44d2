-- 1. niche_categories table
CREATE TABLE public.niche_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_pt text NOT NULL,
  name_en text NOT NULL,
  icon text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_niche_categories_active_order
  ON public.niche_categories (active, display_order)
  WHERE active = true;

-- 2. RLS
ALTER TABLE public.niche_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "niche_categories_read_authenticated"
  ON public.niche_categories
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "niche_categories_admin_write"
  ON public.niche_categories
  FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- 3. updated_at trigger (project uses update_updated_at_column)
CREATE TRIGGER set_niche_categories_updated_at
  BEFORE UPDATE ON public.niche_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Link platform_templates -> niche_categories
ALTER TABLE public.platform_templates
  ADD COLUMN niche_id uuid REFERENCES public.niche_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_platform_templates_niche
  ON public.platform_templates (niche_id);

-- 5. Seed 3 nichos iniciais
INSERT INTO public.niche_categories (slug, name_pt, name_en, icon, description, display_order)
VALUES
  ('saude', 'Saúde', 'Healthcare', 'Stethoscope',
    'Clínicas, consultórios, laboratórios e profissionais de saúde', 1),
  ('seguros-consorcios', 'Corretoras de Seguros e Consórcios', 'Insurance and Consortium Brokers', 'ShieldCheck',
    'Corretoras de seguros, consórcios e produtos financeiros associados', 2),
  ('imobiliario', 'Imobiliário', 'Real Estate', 'Building2',
    'Imobiliárias, corretores autônomos e gestão de locação', 3);