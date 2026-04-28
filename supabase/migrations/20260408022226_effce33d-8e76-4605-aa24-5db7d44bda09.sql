
ALTER TABLE public.tier_module_access
ADD COLUMN sub_features jsonb NOT NULL DEFAULT '{}'::jsonb;
