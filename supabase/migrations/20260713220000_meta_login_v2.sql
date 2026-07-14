-- Meta Login v2: Instagram Login (app IG proprio) + Facebook Messenger
-- (config de Pagina). Amplia a policy de leitura das novas keys.
DROP POLICY IF EXISTS "Authenticated can read stark tools config" ON public.platform_config;
CREATE POLICY "Authenticated can read stark tools config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (key IN (
    'stark_tools_enabled',
    'stark_resale',
    'meta_app_id',
    'meta_whatsapp_config_id',
    'meta_instagram_app_id',
    'meta_facebook_config_id'
  ));
