-- Alinhamento dos planos com Master v7.4 §3.2 e §7.3.
--
-- Master define DEFINITIVAMENTE:
--   Start  — Gratuito,  100 mensagens/mês
--   Hack   — R$ 197/mês, 1.000 mensagens/mês
--   Growth — R$ 397/mês, 5.000 mensagens/mês
--
-- Estado anterior: havia 2 sequências antigas convivendo:
--   - starter/explorer/hack (em UI, types, agency_profiles.tier)
--   - starter/pro/elite (em plan_message_limits)
--
-- Mapeamento das rows existentes (Mapeamento A — preserva posição comercial):
--   starter  → start
--   explorer → hack   (mid)
--   hack     → growth (legacy top)
--   pro      → hack   (mid)
--   elite    → growth (top)
--
-- Justificativa: Master §3.4 define que regressão de tier só acontece por
-- desempenho (queda 50%, inatividade, atrasos). Refactor técnico não pode
-- demitir agência de tier. Mapeamento A honra essa regra preservando o
-- nível comercial original.
--
-- Idempotente: pode rodar várias vezes sem erro.

-- ── 0. Atualiza trigger de validação ──────────────────────────────────────
-- A trigger anterior (criada em 20260411022336/20260428205452) hardcodava
-- ('starter','explorer','hack'). Precisa ser refeita ANTES dos UPDATEs
-- senão eles falham com "Invalid agency tier".
CREATE OR REPLACE FUNCTION public.validate_agency_profile_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier NOT IN ('start', 'hack', 'growth') THEN
    RAISE EXCEPTION 'Invalid agency tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 1. agency_profiles.tier ────────────────────────────────────────────────
-- ORDEM IMPORTA: 'hack' (legacy top) precisa virar 'growth' ANTES de 'explorer'
-- virar 'hack', senão o explorer recém-promovido seria erroneamente subido pra
-- growth também. Toda row 'hack' existente hoje vem da sequência antiga
-- (starter/explorer/hack) porque a nova sequência só passa a valer com esta
-- migração — então é seguro tratar todos 'hack' atuais como legacy top.
UPDATE public.agency_profiles SET tier = 'growth' WHERE tier = 'hack';
UPDATE public.agency_profiles SET tier = 'hack'   WHERE tier = 'explorer';
UPDATE public.agency_profiles SET tier = 'start'  WHERE tier = 'starter';
-- Sequência alternativa starter/pro/elite (se houver rows)
UPDATE public.agency_profiles SET tier = 'hack'   WHERE tier = 'pro';
UPDATE public.agency_profiles SET tier = 'growth' WHERE tier = 'elite';

-- ── 2. plan_message_limits ─────────────────────────────────────────────────
-- Limpa rows antigas (qualquer plan_slug não-Master) e insere os 3 oficiais.
DELETE FROM public.plan_message_limits
  WHERE plan_slug NOT IN ('start', 'hack', 'growth');

INSERT INTO public.plan_message_limits (plan_slug, monthly_limit) VALUES
  ('start',  100),
  ('hack',   1000),
  ('growth', 5000)
ON CONFLICT (plan_slug) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit;

-- ── 3. Default do tier em agency_profiles ──────────────────────────────────
ALTER TABLE public.agency_profiles
  ALTER COLUMN tier SET DEFAULT 'start';

-- ── 4. CHECK constraint pra garantir só valores do Master ──────────────────
ALTER TABLE public.agency_profiles
  DROP CONSTRAINT IF EXISTS agency_profiles_tier_check;
ALTER TABLE public.agency_profiles
  ADD CONSTRAINT agency_profiles_tier_check
  CHECK (tier IN ('start', 'hack', 'growth'));

-- ── 5. Reload schema cache pra PostgREST pegar o CHECK novo ────────────────
NOTIFY pgrst, 'reload schema';
