-- N1 (Admin LLMs autonomy): catalogar preço e modalidade vindos do OpenRouter
-- pra mostrar na listagem de modelos pagos. Auto-prune via consecutive_failures
-- (>=5) também adicionado como trigger pra não depender de cron externo.

ALTER TABLE public.available_llms
  ADD COLUMN IF NOT EXISTS prompt_price_per_million_usd numeric,
  ADD COLUMN IF NOT EXISTS completion_price_per_million_usd numeric,
  ADD COLUMN IF NOT EXISTS modality text;

COMMENT ON COLUMN public.available_llms.prompt_price_per_million_usd IS
  'Preço por 1M tokens de input (USD). NULL quando free. Vem do catálogo OpenRouter.';
COMMENT ON COLUMN public.available_llms.completion_price_per_million_usd IS
  'Preço por 1M tokens de output (USD). NULL quando free.';
COMMENT ON COLUMN public.available_llms.modality IS
  'text | image+text | text+audio | etc. Vem do catálogo OpenRouter (architecture.modality).';

-- Auto-prune: quando consecutive_failures atinge 5, desativa automaticamente
-- e zera o contador na próxima vez que voltar healthy. Trigger é mais barato
-- que cron e roda em tempo real (assim que healthcheck atualiza a linha).
CREATE OR REPLACE FUNCTION public.auto_prune_dead_llms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-desativa se atingiu o threshold e ainda está ativo
  IF NEW.consecutive_failures >= 5 AND NEW.active = true THEN
    NEW.active := false;
    NEW.notes := COALESCE(NEW.notes, '') ||
      E'\n[auto-prune ' || to_char(now(), 'YYYY-MM-DD HH24:MI') ||
      '] Desativado por 5+ falhas consecutivas. Reative manualmente se OpenRouter restaurar.';
  END IF;
  -- Auto-reativa quando volta healthy (caso admin tenha reativado manualmente)
  -- não toca em active — só zera failures (já tratado em healthcheck-llm-models)
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_prune_dead_llms ON public.available_llms;
CREATE TRIGGER trg_auto_prune_dead_llms
  BEFORE UPDATE OF consecutive_failures ON public.available_llms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_prune_dead_llms();
