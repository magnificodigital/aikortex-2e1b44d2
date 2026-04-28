
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON public.user_api_keys
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
