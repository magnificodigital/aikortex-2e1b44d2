-- Fase 2 do Spark Universal — personalizacao + comandos rapidos.
--
-- 1. spark_user_prefs: persona override + tweaks por user (cada agencia
--    configura o Spark dela). 1 row por user.
-- 2. spark_commands: lista CRUD de comandos rapidos ("briefing matinal",
--    "fechar dia", etc.) que viram botoes na home do Spark e atalhos no chat.

-- ── spark_user_prefs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spark_user_prefs (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_preset  TEXT NOT NULL DEFAULT 'jarvis',  -- jarvis|profissional|casual|custom
  persona_prompt  TEXT,                            -- override completo do system prompt (preset=custom)
  user_name       TEXT,                            -- como o Spark chama o user ("Willy", "sir")
  bubble_enabled  BOOLEAN NOT NULL DEFAULT TRUE,   -- mostra bubble flutuante nas paginas
  monthly_token_limit INTEGER,                     -- limite opcional (NULL = sem limite)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN public.spark_user_prefs.persona_preset IS
  'Preset de personalidade. custom usa persona_prompt.';
COMMENT ON COLUMN public.spark_user_prefs.persona_prompt IS
  'System prompt override quando preset=custom. Anexado ao prompt base.';

ALTER TABLE public.spark_user_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spark_user_prefs_owner ON public.spark_user_prefs;
CREATE POLICY spark_user_prefs_owner
  ON public.spark_user_prefs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── spark_commands ────────────────────────────────────────────────────────
-- Comandos rapidos do Spark. Exemplo:
--   label: "Briefing matinal"
--   prompt: "Me da um resumo das qualificacoes de ontem e o que ta agendado pra hoje"
--   icon: "Coffee"
CREATE TABLE IF NOT EXISTS public.spark_commands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  icon          TEXT,                              -- nome do icone lucide-react
  sort_order    INTEGER NOT NULL DEFAULT 0,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_commands_user_order
  ON public.spark_commands(user_id, sort_order, created_at);

ALTER TABLE public.spark_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spark_commands_owner ON public.spark_commands;
CREATE POLICY spark_commands_owner
  ON public.spark_commands FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
