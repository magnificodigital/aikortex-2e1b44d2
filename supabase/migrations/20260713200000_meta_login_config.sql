-- Meta Login Oficial: admin gerencia app_id + config_ids no painel
-- (/admin?tab=api-keys, grupo "Meta — Login Oficial"). Agencias precisam
-- LER essas keys pros botoes "Conectar" funcionarem — amplia a policy.
DROP POLICY IF EXISTS "Authenticated can read stark tools config" ON public.platform_config;
CREATE POLICY "Authenticated can read stark tools config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (key IN (
    'stark_tools_enabled',
    'stark_resale',
    'meta_app_id',
    'meta_whatsapp_config_id',
    'meta_instagram_config_id'
  ));

-- Seed do App ID (ja publico no frontend). Config IDs ficam vazios ate o
-- admin criar as configuracoes de Login for Business no painel Meta.
INSERT INTO public.platform_config (key, value, description, is_secret)
VALUES ('meta_app_id', '2356582444746370', 'App ID do app Aikortex na Meta (Login Oficial)', false)
ON CONFLICT (key) DO NOTHING;
