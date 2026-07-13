/**
 * useMetaIntegration — config oficial da Meta gerenciada pelo ADMIN em
 * /admin?tab=api-keys (grupo "Meta — Login Oficial"), lida em runtime.
 *
 * Substitui as envs VITE_META_* (que exigiam rebuild do Lovable e eram
 * invisiveis): admin salva no painel → botoes "Conectar" acendem na hora
 * pra todas as agencias. Envs continuam como fallback.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MetaIntegration {
  appId: string;
  whatsappConfigId: string;
  instagramConfigId: string;
  loading: boolean;
}

const ENV_APP_ID = import.meta.env.VITE_META_APP_ID || "2356582444746370";
const ENV_WA_CONFIG = import.meta.env.VITE_META_EMBEDDED_CONFIG_ID || "";
const ENV_IG_CONFIG = import.meta.env.VITE_META_IG_CONFIG_ID || "";

export function useMetaIntegration(): MetaIntegration {
  const [state, setState] = useState<MetaIntegration>({
    appId: ENV_APP_ID,
    whatsappConfigId: ENV_WA_CONFIG,
    instagramConfigId: ENV_IG_CONFIG,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase.from("platform_config" as any) as any)
          .select("key, value")
          .in("key", ["meta_app_id", "meta_whatsapp_config_id", "meta_instagram_config_id"]);
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.key] = (r.value ?? "").trim(); });
        setState({
          appId: map.meta_app_id || ENV_APP_ID,
          whatsappConfigId: map.meta_whatsapp_config_id || ENV_WA_CONFIG,
          instagramConfigId: map.meta_instagram_config_id || ENV_IG_CONFIG,
          loading: false,
        });
      } catch {
        setState((prev) => ({ ...prev, loading: false }));
      }
    })();
  }, []);

  return state;
}
