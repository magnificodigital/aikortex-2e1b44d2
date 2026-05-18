-- Sprint 2.7-b1 follow-up: refatora para per-step
-- Motivação: from_name/reply_to são conceitos de email apenas.
-- Cadências mistas (email + whatsapp + sms) ficam confusas com esses campos no nível da cadência.
-- Solução: cada step de email carrega seus próprios from_name/reply_to/subject_template dentro do JSONB.
--
-- Não migramos dados existentes (deploy recente, single-user; agência re-entra os valores no novo UI).

ALTER TABLE public.agent_cadences DROP COLUMN IF EXISTS from_name;
ALTER TABLE public.agent_cadences DROP COLUMN IF EXISTS reply_to;
