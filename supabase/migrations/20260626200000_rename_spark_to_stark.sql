-- Rename Spark → Stark (decisao de brand).
--
-- Reaproveita dados existentes via ALTER TABLE RENAME (preserva PKs, FKs,
-- conteudo). Idempotente — IF EXISTS em tudo.
--
-- Afeta:
--   - tabelas:   spark_user_prefs, spark_commands, spark_usage
--   - indices:   idx_spark_commands_user_order, idx_stark_usage_user_created
--   - policies:  spark_user_prefs_owner, spark_commands_owner, spark_usage_user_read
--   - colunas:   estimated_cost_cents stays (nao tem "spark" no nome)
--   - dados:     user_api_keys.provider rows (spark_voice_* -> stark_voice_*)

-- ── Tables ────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.spark_user_prefs RENAME TO stark_user_prefs;
ALTER TABLE IF EXISTS public.spark_commands  RENAME TO stark_commands;
ALTER TABLE IF EXISTS public.spark_usage     RENAME TO stark_usage;

-- ── Indexes ───────────────────────────────────────────────────────────────
ALTER INDEX IF EXISTS public.idx_spark_commands_user_order  RENAME TO idx_stark_commands_user_order;
ALTER INDEX IF EXISTS public.idx_spark_usage_user_created   RENAME TO idx_stark_usage_user_created;

-- ── Policies ──────────────────────────────────────────────────────────────
-- Policies sao renomeadas via DROP + CREATE pra evitar drift de owner/check clauses.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stark_user_prefs' AND policyname='spark_user_prefs_owner') THEN
    DROP POLICY spark_user_prefs_owner ON public.stark_user_prefs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stark_commands' AND policyname='spark_commands_owner') THEN
    DROP POLICY spark_commands_owner ON public.stark_commands;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stark_usage' AND policyname='spark_usage_user_read') THEN
    DROP POLICY spark_usage_user_read ON public.stark_usage;
  END IF;
END $$;

DROP POLICY IF EXISTS stark_user_prefs_owner ON public.stark_user_prefs;
CREATE POLICY stark_user_prefs_owner
  ON public.stark_user_prefs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS stark_commands_owner ON public.stark_commands;
CREATE POLICY stark_commands_owner
  ON public.stark_commands FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS stark_usage_user_read ON public.stark_usage;
CREATE POLICY stark_usage_user_read
  ON public.stark_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── Provider rows (user_api_keys) ─────────────────────────────────────────
-- spark_voice_id -> stark_voice_id (idem stability/speed)
UPDATE public.user_api_keys
   SET provider = 'stark_voice_id'
 WHERE provider = 'spark_voice_id';
UPDATE public.user_api_keys
   SET provider = 'stark_voice_stability'
 WHERE provider = 'spark_voice_stability';
UPDATE public.user_api_keys
   SET provider = 'stark_voice_speed'
 WHERE provider = 'spark_voice_speed';
