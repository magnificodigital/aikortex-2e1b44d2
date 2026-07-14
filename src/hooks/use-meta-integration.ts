/**
 * useMetaIntegration — config oficial da Meta gerenciada pelo ADMIN em
 * /admin?tab=api-keys (grupo "Meta — Login Oficial"), lida em runtime.
 *
 * Canais e seus fluxos de login (cada um nativo do canal):
 *  - WhatsApp   → Embedded Signup (whatsappConfigId, Facebook App ID)
 *  - Instagram  → Login do Instagram (instagramAppId — app do INSTAGRAM,
 *                 sem Pagina do Facebook)
 *  - Facebook   → Login do Facebook + Pagina (facebookConfigId)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MetaIntegration {
  appId: string;              // Facebook App ID (WhatsApp + Facebook)
  whatsappConfigId: string;
  instagramAppId: string;     // Instagram App ID (Login do Instagram)
  facebookConfigId: string;
  loading: boolean;
}

const ENV_APP_ID = import.meta.env.VITE_META_APP_ID || "2356582444746370";

export function useMetaIntegration(): MetaIntegration {
  const [state, setState] = useState<MetaIntegration>({
    appId: ENV_APP_ID,
    whatsappConfigId: "",
    instagramAppId: "",
    facebookConfigId: "",
    loading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase.from("platform_config" as any) as any)
          .select("key, value")
          .in("key", ["meta_app_id", "meta_whatsapp_config_id", "meta_instagram_app_id", "meta_facebook_config_id"]);
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.key] = (r.value ?? "").trim(); });
        setState({
          appId: map.meta_app_id || ENV_APP_ID,
          whatsappConfigId: map.meta_whatsapp_config_id || "",
          instagramAppId: map.meta_instagram_app_id || "",
          facebookConfigId: map.meta_facebook_config_id || "",
          loading: false,
        });
      } catch {
        setState((prev) => ({ ...prev, loading: false }));
      }
    })();
  }, []);

  return state;
}
