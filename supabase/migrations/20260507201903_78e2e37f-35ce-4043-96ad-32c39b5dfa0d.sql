
-- 1) Create server-only secrets table
CREATE TABLE IF NOT EXISTS public.agency_secrets (
  agency_user_id uuid PRIMARY KEY,
  asaas_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_secrets ENABLE ROW LEVEL SECURITY;

-- Only service_role may read/write. No policies for authenticated/anon = no access.
CREATE POLICY "service role manages agency secrets"
  ON public.agency_secrets FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Block direct grants to public roles
REVOKE ALL ON public.agency_secrets FROM anon, authenticated, public;

-- 2) Migrate existing keys
INSERT INTO public.agency_secrets (agency_user_id, asaas_api_key)
SELECT user_id, asaas_api_key
FROM public.agency_profiles
WHERE asaas_api_key IS NOT NULL
ON CONFLICT (agency_user_id) DO UPDATE SET asaas_api_key = EXCLUDED.asaas_api_key;

-- 3) Replace generated asaas_connected column with a regular boolean populated from secrets
ALTER TABLE public.agency_profiles DROP COLUMN IF EXISTS asaas_connected;
ALTER TABLE public.agency_profiles ADD COLUMN asaas_connected boolean NOT NULL DEFAULT false;

UPDATE public.agency_profiles ap
SET asaas_connected = true
WHERE EXISTS (
  SELECT 1 FROM public.agency_secrets s
  WHERE s.agency_user_id = ap.user_id AND s.asaas_api_key IS NOT NULL
);

-- 4) Drop the sensitive column from agency_profiles
ALTER TABLE public.agency_profiles DROP COLUMN IF EXISTS asaas_api_key;
