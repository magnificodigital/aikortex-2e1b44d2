-- Stark prefs: sliders (tom/resposta/energia), idioma, tools_enabled.
-- Tira nomes proprios (jarvis -> executivo) por motivo de marca.

ALTER TABLE public.stark_user_prefs
  ADD COLUMN IF NOT EXISTS tone            SMALLINT NOT NULL DEFAULT 50,   -- 0=formal, 100=casual
  ADD COLUMN IF NOT EXISTS response_length SMALLINT NOT NULL DEFAULT 25,   -- 0=curto, 100=detalhado
  ADD COLUMN IF NOT EXISTS energy          SMALLINT NOT NULL DEFAULT 50,   -- 0=serio,  100=animado
  ADD COLUMN IF NOT EXISTS language        TEXT     NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS tools_enabled   JSONB;                           -- NULL = todas ativas

-- Constraints (sliders 0..100)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stark_user_prefs_tone_range') THEN
    ALTER TABLE public.stark_user_prefs
      ADD CONSTRAINT stark_user_prefs_tone_range CHECK (tone BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stark_user_prefs_resp_range') THEN
    ALTER TABLE public.stark_user_prefs
      ADD CONSTRAINT stark_user_prefs_resp_range CHECK (response_length BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stark_user_prefs_energy_range') THEN
    ALTER TABLE public.stark_user_prefs
      ADD CONSTRAINT stark_user_prefs_energy_range CHECK (energy BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stark_user_prefs_lang') THEN
    ALTER TABLE public.stark_user_prefs
      ADD CONSTRAINT stark_user_prefs_lang CHECK (language IN ('pt-BR','en','es'));
  END IF;
END $$;

-- Rename do preset 'jarvis' -> 'executivo' (sem nome proprio com marca registrada).
UPDATE public.stark_user_prefs SET persona_preset = 'executivo' WHERE persona_preset = 'jarvis';

-- Comments
COMMENT ON COLUMN public.stark_user_prefs.tone IS '0=formal corporativo, 100=casual descontraido';
COMMENT ON COLUMN public.stark_user_prefs.response_length IS '0=ultra curto (frase), 100=detalhado (paragrafo)';
COMMENT ON COLUMN public.stark_user_prefs.energy IS '0=serio/calmo, 100=animado/expressivo';
COMMENT ON COLUMN public.stark_user_prefs.language IS 'pt-BR | en | es';
COMMENT ON COLUMN public.stark_user_prefs.tools_enabled IS
  'JSONB map {tool_name: bool}. NULL ou ausencia = tool ativa por default.';
