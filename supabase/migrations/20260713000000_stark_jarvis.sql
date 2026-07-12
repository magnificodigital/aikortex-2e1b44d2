-- Stark "Jarvis": memoria entre sessoes + kill-switch admin de tools.

-- 1) Memoria da ultima conversa (gravada pelo Stark Agent no fim da sessao,
--    injetada no system prompt da proxima).
ALTER TABLE public.stark_user_prefs
  ADD COLUMN IF NOT EXISTS last_session_summary TEXT;

COMMENT ON COLUMN public.stark_user_prefs.last_session_summary IS
  'Resumo curto da ultima sessao de voz — memoria do Stark entre sessoes.';

-- 2) Kill-switch global de tools em platform_config (key stark_tools_enabled).
--    RLS atual so deixa platform users lerem; agencias precisam LER essa key
--    especifica pra Settings esconder tools mortas pela plataforma.
DROP POLICY IF EXISTS "Authenticated can read stark tools config" ON public.platform_config;
CREATE POLICY "Authenticated can read stark tools config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (key = 'stark_tools_enabled');

-- 3) Seed: criador de agentes por voz nasce BLOQUEADO (admin libera em
--    /admin?tab=stark). ON CONFLICT preserva ajuste manual do admin.
INSERT INTO public.platform_config (key, value, description, is_secret)
VALUES (
  'stark_tools_enabled',
  '{"open_agent_creator": false}',
  'Kill-switch global das tools do Stark (JSON {tool: bool})',
  false
)
ON CONFLICT (key) DO NOTHING;
