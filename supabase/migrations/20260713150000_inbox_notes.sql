-- Inbox: notas internas + escrita de mensagens pela agencia.

-- 1) role 'note' — nota interna do time. NUNCA enviada pro canal.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_role_check
  CHECK (role IN ('user','agent','system','client','consumer','note'));

-- 2) Agencia pode INSERIR mensagens (notas) nas proprias conversas.
DROP POLICY IF EXISTS agency_insert_messages ON public.messages;
CREATE POLICY agency_insert_messages
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.conversations
    WHERE agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid())
  ));
