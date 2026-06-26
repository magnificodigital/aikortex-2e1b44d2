-- Master v7.4 §3 — billing por agente publicado.
-- Agente em rascunho/setup = grátis (agência configura livre).
-- Agente "Publicado" = Asaas Subscription criada pro cliente final + split
-- nativo divide entre wallet Aikortex (% da margem) e wallet Agência (resto).
--
-- Tabela `user_agents` ganha 3 colunas que controlam o ciclo:
--   published_at            → timestamp; null = draft, set = ativo no Asaas
--   client_subscription_id  → id da Asaas Subscription do cliente final
--   client_info             → snapshot do cliente final (CPF/CNPJ, nome, email)
--                              guardado pra UI e auditoria
--
-- Tabela `agent_templates` ganha preço de revenda padrão (R$ 997 default).

ALTER TABLE user_agents
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS client_info JSONB;

COMMENT ON COLUMN user_agents.published_at IS
  'Quando o agente foi publicado (cobrança Asaas iniciada). NULL = draft, gratis.';
COMMENT ON COLUMN user_agents.client_subscription_id IS
  'ID da Asaas Subscription do cliente final (sub_xxx). NULL se nao publicado.';
COMMENT ON COLUMN user_agents.client_info IS
  'Snapshot do cliente final: { cpf_cnpj, name, email, phone }. Snapshot na hora de publicar.';

CREATE INDEX IF NOT EXISTS idx_user_agents_published
  ON user_agents (published_at)
  WHERE published_at IS NOT NULL;

-- Preço de revenda padrão por template (em centavos)
-- Default R$ 997 conforme exemplo do Master v7.4 §3.3
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_templates') THEN
    ALTER TABLE agent_templates
      ADD COLUMN IF NOT EXISTS retail_price_cents INTEGER DEFAULT 99700;
  END IF;
END $$;

-- Status atual da subscription Asaas pro cliente final.
-- Atualizado pelo webhook de eventos Asaas (asaas-webhook edge function).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agent_subscription_status'
  ) THEN
    CREATE TYPE agent_subscription_status AS ENUM (
      'pending',     -- aguardando primeiro pagamento
      'active',      -- pago em dia
      'overdue',     -- atrasado (agente continua funcionando 7 dias de tolerância)
      'suspended',   -- suspenso por inadimplência (agente parado)
      'canceled'     -- cancelado pela agência
    );
  END IF;
END $$;

ALTER TABLE user_agents
  ADD COLUMN IF NOT EXISTS subscription_status agent_subscription_status DEFAULT NULL;

COMMENT ON COLUMN user_agents.subscription_status IS
  'Status da Asaas Subscription do cliente. Sincronizado pelo webhook. NULL se draft.';

-- Tabela de eventos de cobrança Asaas pra auditoria/dashboard de receita.
-- Cada pagamento gera 1 row. Permite query simples 'minha receita esse mes'.
CREATE TABLE IF NOT EXISTS agent_billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES user_agents(id) ON DELETE CASCADE,
  agency_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_payment_id TEXT NOT NULL,
  event_type      TEXT NOT NULL,    -- 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE' | etc
  gross_amount_cents INTEGER NOT NULL,        -- valor total cobrado do cliente final
  agency_amount_cents INTEGER NOT NULL,       -- parte que ficou pra agencia (split)
  platform_amount_cents INTEGER NOT NULL,     -- parte que ficou pra Aikortex
  client_external_ref TEXT,                   -- cpf/cnpj do cliente final (denormalized)
  raw_payload     JSONB,                       -- evento bruto do Asaas pra debug
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_agency_created
  ON agent_billing_events (agency_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_agent
  ON agent_billing_events (agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_payment_event
  ON agent_billing_events (asaas_payment_id, event_type);

-- RLS: agencia so ve seus proprios eventos.
ALTER TABLE agent_billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_billing_events_agency_read ON agent_billing_events;
CREATE POLICY agent_billing_events_agency_read
  ON agent_billing_events FOR SELECT
  TO authenticated
  USING (agency_user_id = auth.uid());

-- Insert/Update via service_role only (webhook). Agencia nao escreve direto.
