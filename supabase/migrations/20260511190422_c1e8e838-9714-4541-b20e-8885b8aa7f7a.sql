
-- Add client_id to user_agents (nullable; null = ag\u00eancia-wide / "Todos os clientes")
ALTER TABLE public.user_agents ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.agency_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_agents_client_id ON public.user_agents(client_id);

-- Add client_id to user_apps
ALTER TABLE public.user_apps ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.agency_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_apps_client_id ON public.user_apps(client_id);

-- Add herdable payloads + usage_count to platform_templates
ALTER TABLE public.platform_templates ADD COLUMN IF NOT EXISTS agent_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.platform_templates ADD COLUMN IF NOT EXISTS app_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.platform_templates ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;
