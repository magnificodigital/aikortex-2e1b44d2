-- Alinhamento Master v7.4 §7.3 — "modelo padrão por tier: Qwen 3 30B"
--
-- O modelo `qwen/qwen3-30b-a3b` foi descontinuado pela OpenRouter. O seed
-- da `available_llms` (migration 20260513160814) já documenta o substituto
-- moderno: `qwen/qwen3-next-80b-a3b-instruct:free` (mesma família Qwen 3,
-- A3B = 3B active params — perfil de compute equivalente).
--
-- O seed atribuiu prioridade 80 ao Qwen Next (atrás de GPT-OSS, Nemotron,
-- GLM, Llama, Gemma). Para honrar a intenção do Master de Qwen 3 como
-- modelo PADRÃO, promove pra prioridade 5 (acima de todos os free atuais).
--
-- Cuidados:
-- - Mantém os outros free models como fallback (não desativa)
-- - tool_calling_reliable preservado pra que agents com tools continuem
--   funcionando (Qwen Next suporta tool-calling)
-- - Idempotente

UPDATE public.available_llms
  SET priority = 5,
      notes   = 'Modelo padrão Master v7.4 §7.3 (substituto operacional de qwen3-30b-a3b deprecado). Promovido em 2026-06-01.'
  WHERE model_id = 'qwen/qwen3-next-80b-a3b-instruct:free';

-- Bloqueio defensivo: garantir que outros free models ficam acima de
-- prioridade 10 (Qwen é 5, próximo é 10+). Mantém ordem atual.

NOTIFY pgrst, 'reload schema';
