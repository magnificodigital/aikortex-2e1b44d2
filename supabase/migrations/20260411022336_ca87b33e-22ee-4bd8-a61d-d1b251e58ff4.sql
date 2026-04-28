
-- 1. platform_templates
CREATE TABLE IF NOT EXISTS public.platform_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  thumbnail_url text,
  demo_url text,
  features jsonb DEFAULT '[]',
  platform_price_monthly numeric(10,2) NOT NULL,
  min_tier text NOT NULL DEFAULT 'starter',
  is_active boolean DEFAULT true,
  is_exclusive boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_platform_template_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category NOT IN ('agent', 'automation', 'app') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_platform_template_category
  BEFORE INSERT OR UPDATE ON public.platform_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_platform_template_category();

CREATE OR REPLACE FUNCTION public.validate_platform_template_min_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_tier NOT IN ('starter', 'explorer', 'hack') THEN
    RAISE EXCEPTION 'Invalid min_tier: %', NEW.min_tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_platform_template_min_tier
  BEFORE INSERT OR UPDATE ON public.platform_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_platform_template_min_tier();

ALTER TABLE public.platform_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active templates" ON public.platform_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Platform owner manages templates" ON public.platform_templates
  FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

-- Seed initial templates
INSERT INTO public.platform_templates (name, slug, description, category, platform_price_monthly, min_tier, features) VALUES
(
  'SDR - Qualificador de Leads',
  'sdr-qualificador',
  'Agente de IA que qualifica leads automaticamente via WhatsApp e outros canais, faz follow-up e registra no CRM.',
  'agent',
  197.00,
  'starter',
  '["Qualificação automática de leads", "Follow-up D+1, D+3, D+7", "Integração CRM", "Transferência para humano", "Relatório de conversão"]'::jsonb
),
(
  'SAC - Suporte ao Cliente',
  'sac-suporte',
  'Agente de atendimento ao cliente com triagem automática, base de conhecimento e escalonamento para humano.',
  'agent',
  197.00,
  'starter',
  '["Triagem automática de chamados", "Base de conhecimento", "Escalonamento para humano", "CSAT automático", "Dashboard de atendimento"]'::jsonb
),
(
  'Social Media Manager',
  'social-media-manager',
  'Agente especializado em gestão de redes sociais, criação de conteúdo e engajamento automatizado.',
  'agent',
  297.00,
  'explorer',
  '["Criação de conteúdo automática", "Agendamento de posts", "Resposta automática a comentários", "Relatório de engajamento", "Sugestão de hashtags"]'::jsonb
);

-- 2. agency_profiles
CREATE TABLE IF NOT EXISTS public.agency_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  agency_name text,
  logo_url text,
  tier text NOT NULL DEFAULT 'starter',
  active_clients_count integer DEFAULT 0,
  asaas_api_key text,
  asaas_wallet_id text,
  custom_pricing jsonb DEFAULT '{}',
  platform_fee_monthly numeric(10,2) DEFAULT 47.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_agency_profile_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier NOT IN ('starter', 'explorer', 'hack') THEN
    RAISE EXCEPTION 'Invalid agency tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_agency_profile_tier
  BEFORE INSERT OR UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_agency_profile_tier();

ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own profile" ON public.agency_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins manage agency profiles" ON public.agency_profiles
  FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

-- 3. agency_clients
CREATE TABLE IF NOT EXISTS public.agency_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agency_profiles(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_document text,
  status text DEFAULT 'active',
  asaas_customer_id text,
  platform_subscription_id text,
  platform_subscription_status text DEFAULT 'pending',
  client_logo_url text,
  client_primary_color text,
  client_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_agency_client_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'pending', 'suspended') THEN
    RAISE EXCEPTION 'Invalid client status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_agency_client_status
  BEFORE INSERT OR UPDATE ON public.agency_clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_agency_client_status();

ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own clients" ON public.agency_clients
  FOR ALL TO authenticated
  USING (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Platform admins manage agency clients" ON public.agency_clients
  FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

-- 4. client_template_subscriptions
CREATE TABLE IF NOT EXISTS public.client_template_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.agency_clients(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES public.platform_templates(id) NOT NULL,
  agency_id uuid REFERENCES public.agency_profiles(id) NOT NULL,
  agency_price_monthly numeric(10,2) NOT NULL,
  platform_price_monthly numeric(10,2) NOT NULL,
  agency_profit_monthly numeric(10,2) GENERATED ALWAYS AS (agency_price_monthly - platform_price_monthly) STORED,
  status text DEFAULT 'pending',
  trial_ends_at timestamptz,
  asaas_subscription_id text,
  asaas_subscription_status text,
  is_activated boolean DEFAULT false,
  activated_at timestamptz,
  activated_channel text,
  agent_id uuid REFERENCES public.user_agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_client_template_sub_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'trial', 'active', 'cancelled', 'suspended') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_client_template_sub_status
  BEFORE INSERT OR UPDATE ON public.client_template_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_template_sub_status();

ALTER TABLE public.client_template_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own template subscriptions" ON public.client_template_subscriptions
  FOR ALL TO authenticated
  USING (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Platform admins manage template subscriptions" ON public.client_template_subscriptions
  FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

-- 5. billing_events
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agency_profiles(id),
  client_id uuid REFERENCES public.agency_clients(id),
  subscription_id uuid REFERENCES public.client_template_subscriptions(id),
  event_type text NOT NULL,
  amount numeric(10,2),
  platform_amount numeric(10,2),
  agency_amount numeric(10,2),
  asaas_payment_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_billing_event_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type NOT IN ('payment_received', 'payment_failed', 'subscription_created', 'subscription_cancelled', 'refund') THEN
    RAISE EXCEPTION 'Invalid billing event type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_billing_event_type
  BEFORE INSERT OR UPDATE ON public.billing_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_billing_event_type();

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own billing events" ON public.billing_events
  FOR ALL TO authenticated
  USING (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Platform admins manage billing events" ON public.billing_events
  FOR ALL TO authenticated
  USING (is_platform_user(auth.uid()))
  WITH CHECK (is_platform_user(auth.uid()));

-- 6. Trigger: auto-update agency tier when clients change
CREATE OR REPLACE FUNCTION public.trigger_update_agency_tier()
RETURNS TRIGGER AS $$
DECLARE
  target_agency_id uuid;
  active_clients integer;
  new_tier text;
BEGIN
  target_agency_id := COALESCE(NEW.agency_id, OLD.agency_id);

  SELECT COUNT(*) INTO active_clients
  FROM public.agency_clients
  WHERE agency_id = target_agency_id AND status = 'active';

  IF active_clients >= 15 THEN
    new_tier := 'hack';
  ELSIF active_clients >= 5 THEN
    new_tier := 'explorer';
  ELSE
    new_tier := 'starter';
  END IF;

  UPDATE public.agency_profiles
  SET active_clients_count = active_clients,
      tier = new_tier,
      updated_at = now()
  WHERE id = target_agency_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER agency_clients_tier_update
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_clients
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_agency_tier();

-- Updated_at triggers
CREATE TRIGGER update_agency_profiles_updated_at
  BEFORE UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_clients_updated_at
  BEFORE UPDATE ON public.agency_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_template_subs_updated_at
  BEFORE UPDATE ON public.client_template_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_templates_updated_at
  BEFORE UPDATE ON public.platform_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
