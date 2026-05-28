-- Agency-level activation list de canais que aparecem nos agentes.
-- Default = email + whatsapp (canais já implementados como cadência).
-- Voz, SMS e canais sociais ficam "em breve" até a agência ativá-los.

ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS enabled_channels text[] DEFAULT ARRAY['email', 'whatsapp']::text[];

-- Backfill pra rows existentes que possam ter NULL
UPDATE public.agency_profiles
SET enabled_channels = ARRAY['email', 'whatsapp']::text[]
WHERE enabled_channels IS NULL;
