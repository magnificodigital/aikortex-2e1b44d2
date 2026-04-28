
-- Planos disponíveis no SaaS
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  trial_days integer DEFAULT 7,
  features jsonb DEFAULT '[]',
  limits jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assinaturas dos tenants
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'trialing',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  payment_provider text,
  payment_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Histórico de faturas
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'BRL',
  status text DEFAULT 'pending',
  due_date date,
  paid_at timestamptz,
  description text,
  payment_provider text,
  payment_id text,
  created_at timestamptz DEFAULT now()
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('trialing','active','past_due','canceled','paused') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_subscription_status
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_status();

CREATE OR REPLACE FUNCTION public.validate_subscription_billing_cycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: %', NEW.billing_cycle;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_subscription_billing_cycle
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_billing_cycle();

CREATE OR REPLACE FUNCTION public.validate_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','paid','overdue','canceled') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_invoice_status
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_status();

-- Updated_at triggers
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Seed: 3 planos iniciais
INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, is_featured, trial_days, features, limits) VALUES
('Starter', 'starter', 'Ideal para agências iniciando com automação IA', 197, 1970, false, 7,
  '["3 agentes de IA","5 fluxos de automação","1.000 contatos","WhatsApp + Instagram","Suporte por email"]',
  '{"agents":3,"flows":5,"contacts":1000,"team_members":2,"apps":1}'),
('Pro', 'pro', 'Para agências em crescimento que precisam de mais poder', 397, 3970, true, 14,
  '["20 agentes de IA","Fluxos ilimitados","10.000 contatos","Todos os canais","Voz e ligações","App Builder","Suporte prioritário"]',
  '{"agents":20,"flows":-1,"contacts":10000,"team_members":10,"apps":5}'),
('Elite', 'elite', 'Para agências que querem oferecer o Aikortex com sua marca', 797, 7970, false, 14,
  '["Agentes ilimitados","Fluxos ilimitados","Contatos ilimitados","Todos os canais","White-label completo","Domínio customizado","Programa de parceiros Elite","Gerente de conta dedicado"]',
  '{"agents":-1,"flows":-1,"contacts":-1,"team_members":-1,"apps":-1}');
