CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  is_secret boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform owners can manage config" ON public.platform_config
  FOR ALL TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Edge functions can read config" ON public.platform_config
  FOR SELECT TO service_role USING (true);