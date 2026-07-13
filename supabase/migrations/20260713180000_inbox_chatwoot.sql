-- Inbox clone Chatwoot: direcao da ultima mensagem (seta ↩ na lista).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_direction TEXT
    CHECK (last_message_direction IN ('inbound','outbound'));
