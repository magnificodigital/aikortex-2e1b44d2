-- Tabela conversations para Caixa Omnichannel da Agência (MASTER v7.4 §17)
-- Armazena conversas entre agência e clientes diretos (agency_inbound)
-- e entre clientes e consumidores finais (client_to_consumer)

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agency_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.agency_clients(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('agency_inbound', 'client_to_consumer')),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_agency ON public.conversations(agency_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_direction ON public.conversations(direction);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Agência vê suas próprias conversas
CREATE POLICY "agency_view_conversations"
  ON public.conversations FOR SELECT
  USING (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ));

-- Agência insere conversas próprias
CREATE POLICY "agency_insert_conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ));

-- Agência atualiza suas conversas
CREATE POLICY "agency_update_conversations"
  ON public.conversations FOR UPDATE
  USING (agency_id IN (
    SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
  ));

-- Platform admins têm acesso total
CREATE POLICY "platform_admin_all_conversations"
  ON public.conversations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('platform_owner', 'platform_admin')
  ));

-- Trigger updated_at
CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela messages para mensagens individuais dentro das conversas
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system', 'client', 'consumer')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'template', 'interactive')),
  media_url TEXT,
  media_metadata JSONB DEFAULT '{}'::jsonb,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Agência vê mensagens de suas conversas
CREATE POLICY "agency_view_messages"
  ON public.messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.conversations
    WHERE agency_id IN (
      SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
    )
  ));

-- Agência insere mensagens em suas conversas
CREATE POLICY "agency_insert_messages"
  ON public.messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.conversations
    WHERE agency_id IN (
      SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()
    )
  ));

-- Platform admins têm acesso total
CREATE POLICY "platform_admin_all_messages"
  ON public.messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('platform_owner', 'platform_admin')
  ));
