
CREATE TABLE public.user_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Meu App',
  description TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'web',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  tables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own apps"
  ON public.user_apps
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_apps_updated_at
  BEFORE UPDATE ON public.user_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
