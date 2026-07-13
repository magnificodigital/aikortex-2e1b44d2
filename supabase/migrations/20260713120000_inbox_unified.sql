-- Bloco 1 — Inbox unificado: conversations vira camada canonica.
-- whatsapp-webhook passa a escrever aqui (dual-write com whatsapp_messages),
-- cria lead no CRM no primeiro contato, e respeita human takeover.

-- 1) Colunas novas em conversations
ALTER TABLE public.conversations
  -- Human takeover: false = humano assumiu, agente de IA NAO responde.
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- Lead do CRM criado/vinculado automaticamente no primeiro inbound.
  ADD COLUMN IF NOT EXISTS crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  -- Dono operacional (user da agencia) — facilita RLS e lookups do webhook.
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Dedupe de conversa por contato/canal dentro da agencia.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_agency_channel_phone
  ON public.conversations(agency_id, channel, contact_phone)
  WHERE contact_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_crm_contact
  ON public.conversations(crm_contact_id);

-- 2) Realtime: frontend assina INSERT/UPDATE dessas tabelas.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3) crm_contacts: origem do lead (pra saber que veio do inbox).
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.conversations.ai_enabled IS
  'false = humano assumiu a conversa; agente de IA para de responder.';
COMMENT ON COLUMN public.conversations.crm_contact_id IS
  'Lead do CRM criado/vinculado automaticamente no primeiro inbound.';
