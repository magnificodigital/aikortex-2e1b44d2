-- Revenda do Stark: admin define preco base, agencia coloca markup e
-- vende pro cliente final. Mesmo modelo do asaas-subscribe-template:
-- split Asaas com fixedValue = base (Aikortex), agencia fica com o resto.

-- 1) Assinaturas de Stark por cliente (espelha client_template_subscriptions)
CREATE TABLE IF NOT EXISTS public.client_stark_subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                 UUID NOT NULL REFERENCES public.agency_profiles(id) ON DELETE CASCADE,
  client_id                 UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_price_monthly      NUMERIC NOT NULL,   -- preco que a agencia cobra (reais)
  platform_price_monthly    NUMERIC NOT NULL,   -- base da Aikortex no momento da venda (reais)
  status                    TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','overdue','canceled')),
  trial_ends_at             TIMESTAMPTZ,
  asaas_subscription_id     TEXT,
  asaas_subscription_status TEXT,
  activated_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 1 Stark por cliente
  CONSTRAINT client_stark_subscriptions_client_unique UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_stark_subs_agency
  ON public.client_stark_subscriptions(agency_id);

ALTER TABLE public.client_stark_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_stark_subs_agency_all ON public.client_stark_subscriptions;
CREATE POLICY client_stark_subs_agency_all
  ON public.client_stark_subscriptions FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_client_stark_subs_updated_at ON public.client_stark_subscriptions;
CREATE TRIGGER update_client_stark_subs_updated_at
  BEFORE UPDATE ON public.client_stark_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Preco base do Stark (admin edita em /admin?tab=stark)
INSERT INTO public.platform_config (key, value, description, is_secret)
VALUES (
  'stark_resale',
  '{"base_price_monthly": 97}',
  'Revenda do Stark: preco base mensal em reais (fixedValue do split Asaas)',
  false
)
ON CONFLICT (key) DO NOTHING;

-- 3) Agencias precisam LER stark_resale (pra saber o minimo) — amplia a
-- policy de leitura que antes cobria so stark_tools_enabled.
DROP POLICY IF EXISTS "Authenticated can read stark tools config" ON public.platform_config;
CREATE POLICY "Authenticated can read stark tools config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (key IN ('stark_tools_enabled', 'stark_resale'));
