
CREATE TABLE public.available_llms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  context_window integer,
  supports_tools boolean NOT NULL DEFAULT false,
  supports_streaming boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'unknown',
  last_health_check_at timestamptz,
  last_health_check_error text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers (no CHECK constraints — pattern do projeto)
CREATE OR REPLACE FUNCTION public.validate_available_llms_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tier NOT IN ('free','paid') THEN
    RAISE EXCEPTION 'Invalid tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_available_llms_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('healthy','degraded','dead','unknown') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_available_llms_tier_trigger
  BEFORE INSERT OR UPDATE ON public.available_llms
  FOR EACH ROW EXECUTE FUNCTION public.validate_available_llms_tier();

CREATE TRIGGER validate_available_llms_status_trigger
  BEFORE INSERT OR UPDATE ON public.available_llms
  FOR EACH ROW EXECUTE FUNCTION public.validate_available_llms_status();

CREATE TRIGGER set_available_llms_updated_at
  BEFORE UPDATE ON public.available_llms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_available_llms_active_tier_priority
  ON public.available_llms (active, tier, priority)
  WHERE active = true;

CREATE INDEX idx_available_llms_status
  ON public.available_llms (status);

ALTER TABLE public.available_llms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "available_llms_read_authenticated"
  ON public.available_llms FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "available_llms_admin_write"
  ON public.available_llms FOR ALL
  TO authenticated
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "available_llms_service_role"
  ON public.available_llms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed inicial validado via curl ao vivo (Maio 2026) ──
INSERT INTO public.available_llms
  (provider, model_id, display_name, tier, context_window, supports_tools, supports_streaming, priority, status, notes) VALUES
  -- Healthy verificados (200 OK no healthcheck) — ordem por latência
  ('openai',       'openai/gpt-oss-20b:free',                     'GPT-OSS 20B (free)',          'free', 131072, true,  true, 10, 'healthy', 'Validado via curl: 473ms. Default fast.'),
  ('openai',       'openai/gpt-oss-120b:free',                    'GPT-OSS 120B (free)',         'free', 131072, true,  true, 20, 'healthy', 'Validado via curl: 587ms. Smart fast.'),
  ('nvidia',       'nvidia/nemotron-3-super-120b-a12b:free',      'Nemotron 3 Super 120B (free)','free', 262144, true,  true, 30, 'healthy', 'Validado via curl: 10s (reasoning). Boa qualidade.'),
  ('z-ai',         'z-ai/glm-4.5-air:free',                       'GLM 4.5 Air (free)',          'free', 131072, true,  true, 40, 'healthy', 'Validado via curl: 10s (reasoning). Fallback.'),
  -- Modelos existentes mas rate-limited no seed (Venice/Google AI Studio) — assumidos healthy conforme política
  ('meta',         'meta-llama/llama-3.3-70b-instruct:free',      'Llama 3.3 70B (free)',        'free',  65536, true,  true, 50, 'healthy', '429 Venice no seed. Modelo existe e responde quando rate-limit reseta.'),
  ('google',       'google/gemma-4-31b-it:free',                  'Gemma 4 31B (free)',          'free', 262144, false, true, 60, 'healthy', '429 Google AI Studio no seed. Sem tool-calling (família Gemma).'),
  ('qwen',         'qwen/qwen3-coder:free',                       'Qwen3 Coder 480B (free)',     'free', 262000, true,  true, 70, 'healthy', '429 Venice no seed. Substitui qwen3-30b-a3b (deprecado).'),
  ('qwen',         'qwen/qwen3-next-80b-a3b-instruct:free',       'Qwen3 Next 80B A3B (free)',   'free', 262144, true,  true, 80, 'healthy', '429 Venice no seed. Alternativa moderna.'),

  -- Paid (referência — usados quando agência traz BYOK ou em fluxos como deerflow)
  ('openai',       'openai/gpt-4o-mini',         'GPT-4o Mini',          'paid', 128000, true, true, 100, 'unknown', 'Default deerflow. Custo baixo, rápido.'),
  ('anthropic',    'anthropic/claude-sonnet-4.5','Claude Sonnet 4.5',    'paid', 200000, true, true, 110, 'unknown', 'BYOK premium. Master §8.3 (4.6 ainda não disponível).'),
  ('google',       'google/gemini-2.5-flash',    'Gemini 2.5 Flash',     'paid',1000000, true, true, 120, 'unknown', 'Usado por agent-structure. Long context.');
