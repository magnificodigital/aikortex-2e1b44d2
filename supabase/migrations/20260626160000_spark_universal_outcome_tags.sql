-- Fase 1 do Spark Universal — tags de outcome e agent_id em conversas.
--
-- Spark precisa responder perguntas tipo:
--   "Quantas qualificações o agente SDR fez hoje?"
--   "Quantos tickets o SAC resolveu essa semana?"
--   "Quantas reuniões o BDR agendou?"
--
-- Pra isso conversations precisa:
--   1. agent_id  — vincular conversa ao agente responsavel
--   2. outcome_tags — etiquetas semanticas do resultado (qualified, resolved, etc.)
--
-- conversations.tags ja existe mas eh generico (urgent, vip, etc.).
-- outcome_tags eh dedicado a RESULTADO/INTENT — separa as responsabilidades.
--
-- Para call_logs, agent_id ja existe (call_logs eh per-agent desde sempre).
-- Adicionamos so outcome_tags.
--
-- user_agents.config (JSONB) ganha um campo novo tracked_outcomes via aplicacao
-- (sem migration) com defaults inteligentes por tipo de agente.

-- ── conversations: agent_id + outcome_tags ────────────────────────────────
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.user_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outcome_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.conversations.agent_id IS
  'Agente responsavel pela conversa. NULL = nao vinculada (sistema, suporte humano, etc.).';
COMMENT ON COLUMN public.conversations.outcome_tags IS
  'Tags semanticas do resultado (qualified, resolved, escalated, meeting_booked, etc.). Usadas pelo Spark pra responder perguntas de metricas.';

CREATE INDEX IF NOT EXISTS idx_conversations_agent
  ON public.conversations(agent_id)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_outcome_tags
  ON public.conversations USING GIN(outcome_tags);

-- ── call_logs: outcome_tags (agent_id ja existe) ──────────────────────────
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS outcome_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.call_logs.outcome_tags IS
  'Tags semanticas do resultado da chamada (qualified, no_show, meeting_booked, etc.).';

CREATE INDEX IF NOT EXISTS idx_call_logs_outcome_tags
  ON public.call_logs USING GIN(outcome_tags);

-- ── spark_usage: tracking de tokens consumidos pelo Spark ─────────────────
-- Cada turn de conversa Spark gera 1 row. Permite dashboard de custos e
-- aplicar limite mensal por agencia.
CREATE TABLE IF NOT EXISTS public.spark_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      UUID,                                -- agrupa turns da mesma sessao
  llm_provider    TEXT NOT NULL,                       -- openrouter|anthropic|openai|gemini
  llm_model       TEXT NOT NULL,                       -- model_id usado
  prompt_tokens   INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens    INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,              -- centavos BRL, calculo aproximado
  tools_called    TEXT[] DEFAULT '{}',                 -- ['list_agents', 'count_outcomes']
  duration_ms     INTEGER,                              -- latencia do turn completo
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_usage_user_created
  ON public.spark_usage(user_id, created_at DESC);

ALTER TABLE public.spark_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spark_usage_user_read ON public.spark_usage;
CREATE POLICY spark_usage_user_read
  ON public.spark_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert via service_role (edge function spark-chat). User nao escreve direto.
