-- Continuação do realinhamento iniciado em 20260531100000_align_tiers_to_master_v74.
--
-- Aquela migration migrou agency_profiles + plan_message_limits + triggers,
-- mas esqueceu DUAS tabelas vinculadas ao mesmo esquema antigo:
--   - tier_module_access  → gating de UI da sidebar
--   - platform_templates  → wizard de adicionar cliente filtra por min_tier
--   - partner_tiers       → tier "comercial" do partner, ainda usado pela sidebar
--
-- Sintoma reportado: agência recém-cadastrada nasce com tier='start', mas
-- tier_module_access só tem rows pra 'starter' → sidebar bloqueia TUDO com
-- ícone de cadeado (use-module-access.ts retorna `accessMap[key] ?? false`).
--
-- Mapeamento (mesma regra da 20260531100000, Master v7.4 §3.2):
--   starter  → start
--   explorer → hack    (mid)
--   hack     → growth  (legacy top)
--
-- ORDEM IMPORTA: 'hack' (legacy top) precisa virar 'growth' ANTES de 'explorer'
-- virar 'hack', senão o explorer recém-promovido subiria errado pra growth.
--
-- Idempotente.

-- ── 1. Triggers de validação ───────────────────────────────────────────────
-- Precisa atualizar ANTES dos UPDATEs senão a validação bloqueia.

-- ⚠️ Esta trigger foi criada manualmente no painel Supabase (fora de migration)
-- e por isso não estava versionada. Definindo aqui pra ficar sob controle e
-- não regredir em ambiente novo. Tiers do Master v7.4: start/hack/growth.
CREATE OR REPLACE FUNCTION public.validate_tier_module_access_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier NOT IN ('start', 'hack', 'growth') THEN
    RAISE EXCEPTION 'Invalid tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_partner_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier NOT IN ('start', 'hack', 'growth') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_platform_template_min_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_tier NOT IN ('start', 'hack', 'growth') THEN
    RAISE EXCEPTION 'Invalid template min_tier: %', NEW.min_tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 2. tier_module_access ──────────────────────────────────────────────────
UPDATE public.tier_module_access SET tier = 'growth' WHERE tier = 'hack';
UPDATE public.tier_module_access SET tier = 'hack'   WHERE tier = 'explorer';
UPDATE public.tier_module_access SET tier = 'start'  WHERE tier = 'starter';

-- ── 3. platform_templates.min_tier ─────────────────────────────────────────
UPDATE public.platform_templates SET min_tier = 'growth' WHERE min_tier = 'hack';
UPDATE public.platform_templates SET min_tier = 'hack'   WHERE min_tier = 'explorer';
UPDATE public.platform_templates SET min_tier = 'start'  WHERE min_tier = 'starter';

ALTER TABLE public.platform_templates
  ALTER COLUMN min_tier SET DEFAULT 'start';

-- ── 4. partner_tiers ───────────────────────────────────────────────────────
UPDATE public.partner_tiers SET tier = 'growth' WHERE tier = 'hack';
UPDATE public.partner_tiers SET tier = 'hack'   WHERE tier = 'explorer';
UPDATE public.partner_tiers SET tier = 'start'  WHERE tier = 'starter';

ALTER TABLE public.partner_tiers
  ALTER COLUMN tier SET DEFAULT 'start';

-- ── 5. Reload schema cache ─────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
