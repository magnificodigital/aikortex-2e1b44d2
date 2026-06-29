-- Fase 1 da migracao Stark Voice (LiveKit Agents)
--
-- Master v7.4 atualizado: Stark ganha voz Jarvis-fast via LiveKit, com
-- creditos por tier:
--   Start (R$ 197/mes)  → 240 min/mes
--   Hack  (R$ 397/mes)  → 540 min/mes
--   Growth (R$ 697/mes) → 1000 min/mes
--
-- Creditos resetam mensalmente. Excedente vira pack pago avulso ou cai
-- pro modo texto ate o proximo mes.

-- ── Colunas em agency_profiles ────────────────────────────────────────
-- monthly_voice_minutes = quanto o tier inclui (snapshot pra evitar
--   lookup recorrente. Atualiza quando tier muda.)
-- voice_minutes_used = consumo do ciclo atual
-- voice_period_start = inicio do ciclo atual (reset mensal)
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS monthly_voice_minutes INTEGER NOT NULL DEFAULT 240,
  ADD COLUMN IF NOT EXISTS voice_minutes_used DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_period_start TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.agency_profiles.monthly_voice_minutes IS
  'Minutos de Stark voz inclusos no tier atual. Default 240 (Start). Hack=540, Growth=1000.';
COMMENT ON COLUMN public.agency_profiles.voice_minutes_used IS
  'Consumo de voz Stark no periodo corrente (em minutos com 2 casas decimais).';
COMMENT ON COLUMN public.agency_profiles.voice_period_start IS
  'Inicio do ciclo mensal de creditos. Reset rola via cron quando passa 30 dias.';

-- ── Tabela stark_voice_credit_packs (compras avulsas) ─────────────────
-- User compra pack quando passa do limite OU pra ter buffer. Creditos do
-- pack NAO expiram (acumulam ate consumir).
CREATE TABLE IF NOT EXISTS public.stark_voice_credit_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes_total   INTEGER NOT NULL,           -- 60, 300, 1000
  minutes_used    DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_cents     INTEGER NOT NULL,           -- preco pago (R$ 49 = 4900, etc)
  asaas_payment_id TEXT,                       -- correlaciona com Asaas
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid | expired
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ                  -- NULL = nao expira
);

CREATE INDEX IF NOT EXISTS idx_stark_voice_packs_user_active
  ON public.stark_voice_credit_packs(user_id, status)
  WHERE status = 'paid';

ALTER TABLE public.stark_voice_credit_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stark_voice_packs_owner ON public.stark_voice_credit_packs;
CREATE POLICY stark_voice_packs_owner
  ON public.stark_voice_credit_packs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── Tabela stark_voice_sessions (telemetria de cada sessao de voz) ────
-- Cada sessao LiveKit (do connect ate o disconnect) gera 1 row.
-- Necessario pra debitar creditos com precisao e debug.
CREATE TABLE IF NOT EXISTS public.stark_voice_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id       UUID REFERENCES public.agency_profiles(id) ON DELETE SET NULL,
  livekit_room_id TEXT,                        -- room SID do LiveKit
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  stt_seconds     INTEGER DEFAULT 0,           -- tempo de fala do user
  tts_seconds     INTEGER DEFAULT 0,           -- tempo de fala do Stark
  tools_called    TEXT[] DEFAULT '{}',         -- ferramentas usadas
  llm_provider    TEXT,
  llm_model       TEXT,
  llm_prompt_tokens INTEGER DEFAULT 0,
  llm_completion_tokens INTEGER DEFAULT 0,
  /** Custo estimado em centavos BRL — pra ver overhead operacional. */
  estimated_cost_cents INTEGER DEFAULT 0,
  /** De onde os creditos saíram: 'tier' = mensalidade, 'pack' = pack avulso. */
  credit_source   TEXT,
  pack_id         UUID REFERENCES public.stark_voice_credit_packs(id) ON DELETE SET NULL,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stark_voice_sessions_user_date
  ON public.stark_voice_sessions(user_id, created_at DESC);

ALTER TABLE public.stark_voice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stark_voice_sessions_owner ON public.stark_voice_sessions;
CREATE POLICY stark_voice_sessions_owner
  ON public.stark_voice_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── Função: reset mensal de minutos ───────────────────────────────────
-- Chamada por cron ou inline quando voice_period_start fica >30 dias velho.
-- Idempotente — multiplas chamadas no mesmo ciclo nao quebram.
CREATE OR REPLACE FUNCTION public.reset_stark_voice_period_if_needed(p_agency_id UUID)
RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  SELECT voice_period_start INTO v_period_start
  FROM public.agency_profiles WHERE id = p_agency_id;

  IF v_period_start IS NULL OR v_period_start < now() - INTERVAL '30 days' THEN
    UPDATE public.agency_profiles
       SET voice_minutes_used = 0,
           voice_period_start = now()
     WHERE id = p_agency_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Função: consome creditos de voz (chamada pelo LiveKit Agent backend) ──
-- Logica:
--   1. Reseta ciclo se necessario
--   2. Pega tier_minutes - used. Se sobra >= consumo, debita do tier.
--   3. Senao, debita o que sobra do tier + resto do primeiro pack pago.
--   4. Se acabar tudo, retorna { ok: false } pro agent fechar conexao.
--
-- Retorna json: { ok, remaining_tier, remaining_pack, pack_id?, source }
CREATE OR REPLACE FUNCTION public.consume_stark_voice_minutes(
  p_agency_id UUID,
  p_minutes DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_tier_total INTEGER;
  v_used DECIMAL;
  v_tier_remaining DECIMAL;
  v_pack_id UUID;
  v_pack_total INTEGER;
  v_pack_used DECIMAL;
  v_pack_remaining DECIMAL;
  v_consumed_from_tier DECIMAL := 0;
  v_consumed_from_pack DECIMAL := 0;
  v_to_consume DECIMAL := p_minutes;
BEGIN
  PERFORM public.reset_stark_voice_period_if_needed(p_agency_id);

  SELECT monthly_voice_minutes, voice_minutes_used
    INTO v_tier_total, v_used
    FROM public.agency_profiles WHERE id = p_agency_id;

  v_tier_remaining := GREATEST(0, v_tier_total - v_used);

  -- 1) Consume from tier first
  IF v_tier_remaining > 0 THEN
    v_consumed_from_tier := LEAST(v_to_consume, v_tier_remaining);
    UPDATE public.agency_profiles
       SET voice_minutes_used = voice_minutes_used + v_consumed_from_tier
     WHERE id = p_agency_id;
    v_to_consume := v_to_consume - v_consumed_from_tier;
  END IF;

  -- 2) Se sobrou, vai pro pack mais antigo pago e nao expirado
  IF v_to_consume > 0 THEN
    SELECT p.id, p.minutes_total, p.minutes_used
      INTO v_pack_id, v_pack_total, v_pack_used
      FROM public.stark_voice_credit_packs p
      JOIN public.agency_profiles a ON a.user_id = p.user_id
     WHERE a.id = p_agency_id
       AND p.status = 'paid'
       AND (p.expires_at IS NULL OR p.expires_at > now())
       AND p.minutes_used < p.minutes_total
     ORDER BY p.paid_at NULLS LAST
     LIMIT 1;

    IF v_pack_id IS NOT NULL THEN
      v_pack_remaining := v_pack_total - v_pack_used;
      v_consumed_from_pack := LEAST(v_to_consume, v_pack_remaining);
      UPDATE public.stark_voice_credit_packs
         SET minutes_used = minutes_used + v_consumed_from_pack
       WHERE id = v_pack_id;
      v_to_consume := v_to_consume - v_consumed_from_pack;
    END IF;
  END IF;

  -- 3) Retorna estado pos-debito
  SELECT monthly_voice_minutes - voice_minutes_used INTO v_tier_remaining
    FROM public.agency_profiles WHERE id = p_agency_id;

  RETURN jsonb_build_object(
    'ok', v_to_consume = 0,
    'consumed_from_tier', v_consumed_from_tier,
    'consumed_from_pack', v_consumed_from_pack,
    'remaining_tier', GREATEST(0, v_tier_remaining),
    'pack_id', v_pack_id,
    'short_minutes', v_to_consume
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Atualiza monthly_voice_minutes quando tier muda ───────────────────
CREATE OR REPLACE FUNCTION public.sync_voice_minutes_to_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    NEW.monthly_voice_minutes := CASE NEW.tier
      WHEN 'start'  THEN 240
      WHEN 'hack'   THEN 540
      WHEN 'growth' THEN 1000
      ELSE 240
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_voice_minutes ON public.agency_profiles;
CREATE TRIGGER trg_sync_voice_minutes
  BEFORE UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_voice_minutes_to_tier();
