import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { useMetaIntegration } from "@/hooks/use-meta-integration";
import { toast } from "sonner";

/**
 * Botão "Conectar via Meta" — onboarding em ~5 min sem cola manual de
 * credenciais. Usa Facebook JS SDK + Embedded Signup flow:
 *
 *   1. Lazy-load do SDK do Facebook (script tag injetada na primeira vez)
 *   2. FB.login({ config_id, response_type: 'code' }) abre popup Meta
 *   3. Popup retorna { code, phone_number_id, waba_id }
 *   4. POSTa pra edge function whatsapp-embedded-signup que troca code
 *      por token permanente, inscreve webhook e salva credentials
 *
 * Quando Meta aprovar Tech Provider + permissões, cria-se o config no
 * Business Manager e seta a env VITE_META_EMBEDDED_CONFIG_ID. Sem essas
 * envs o botão mostra estado "indisponível".
 */

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const FALLBACK_APP_ID = import.meta.env.VITE_META_APP_ID || "2356582444746370";
const SDK_VERSION = "v21.0";

let sdkLoadingPromise: Promise<void> | null = null;

/** Exportado: reutilizado pelo connect do Instagram (mesmo SDK/app).
 *  appId vem da config do admin (platform_config) via useMetaIntegration. */
export function loadFacebookSdk(appId: string = FALLBACK_APP_ID): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.FB) return Promise.resolve();
  if (sdkLoadingPromise) return sdkLoadingPromise;

  sdkLoadingPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      try {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: false,
          version: SDK_VERSION,
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      // Já tem script tag mas FB não inicializou ainda; espera o fbAsyncInit
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = `https://connect.facebook.net/en_US/sdk.js`;
    script.onerror = () => reject(new Error("Falha ao carregar SDK Facebook"));
    document.body.appendChild(script);
  });

  return sdkLoadingPromise;
}

type Props = {
  onConnected?: (info: {
    phone_number_id: string;
    waba_id: string;
    display_phone_number: string | null;
    verified_name: string | null;
  }) => void;
};

export default function MetaEmbeddedSignupButton({ onConnected }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Config oficial gerenciada pelo admin em /admin?tab=api-keys
  const meta = useMetaIntegration();

  const configMissing = !meta.loading && !meta.whatsappConfigId;

  useEffect(() => {
    if (meta.loading || configMissing) return;
    loadFacebookSdk(meta.appId)
      .then(() => setSdkReady(true))
      .catch((e) => {
        console.error("Facebook SDK load failed:", e);
        toast.error("Não foi possível carregar o SDK do Facebook");
      });
  }, [meta.loading, meta.appId, configMissing]);

  // Watchdog: FB.login sem retorno (popup bloqueado) travava o spinner
  // pra sempre. 45s sem callback → reseta e orienta.
  useEffect(() => {
    if (!connecting) return;
    const t = setTimeout(() => {
      setConnecting(false);
      toast.error("O popup da Meta não respondeu — verifique se o navegador bloqueou popups deste site e tente de novo.");
    }, 45000);
    return () => clearTimeout(t);
  }, [connecting]);

  const handleClick = () => {
    if (!window.FB) {
      toast.error("SDK do Facebook ainda não carregou — tenta de novo");
      return;
    }
    if (configMissing) {
      toast.error("Embedded Signup não configurado (falta VITE_META_EMBEDDED_CONFIG_ID)");
      return;
    }

    setConnecting(true);

    // Escuta o postMessage que o Embedded Signup envia com waba_id +
    // phone_number_id ANTES do callback do FB.login resolver com o code.
    let signupData: { phone_number_id?: string; waba_id?: string } = {};
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          signupData = {
            phone_number_id: data?.data?.phone_number_id,
            waba_id: data?.data?.waba_id,
          };
        }
      } catch {
        // payload não-JSON, ignora
      }
    };
    window.addEventListener("message", messageHandler);

    window.FB.login(
      async (response: any) => {
        window.removeEventListener("message", messageHandler);

        if (response?.authResponse?.code) {
          const code = response.authResponse.code as string;
          const { phone_number_id, waba_id } = signupData;
          if (!phone_number_id || !waba_id) {
            toast.error("Onboarding incompleto: faltaram dados do número selecionado");
            setConnecting(false);
            return;
          }
          await exchangeAndSave({ code, phone_number_id, waba_id })
            .then((info) => {
              toast.success("WhatsApp Business conectado via Meta");
              onConnected?.(info);
            })
            .catch((err) => {
              toast.error(`Falha ao salvar conexão: ${err.message}`);
            })
            .finally(() => setConnecting(false));
        } else {
          // Usuário cancelou ou erro
          setConnecting(false);
          if (response?.error) {
            toast.error(`Erro Meta: ${response.error.message ?? "desconhecido"}`);
          }
        }
      },
      {
        config_id: meta.whatsappConfigId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "whatsapp_business_app_onboarding" },
      },
    );
  };

  if (meta.loading) {
    return (
      <Button type="button" className="w-full gap-2" disabled>
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
      </Button>
    );
  }

  if (configMissing) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center space-y-1">
        <p className="text-xs font-medium text-foreground">Conectar via Meta — aguardando configuração</p>
        <p className="text-[11px] text-muted-foreground">
          O administrador da plataforma precisa preencher o Config ID do WhatsApp em
          Admin → Chaves de API → "Meta — Login Oficial".
        </p>
      </div>
    );
  }

  return (
    <Button
      type="button"
      className="w-full gap-2 bg-[#25D366] hover:bg-[#1da851] text-white"
      onClick={handleClick}
      disabled={!sdkReady || connecting}
    >
      {connecting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Conectando…
        </>
      ) : (
        <>
          <WhatsAppIcon className="w-4 h-4" /> Conectar via Meta
        </>
      )}
    </Button>
  );
}

async function exchangeAndSave(params: {
  code: string;
  phone_number_id: string;
  waba_id: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");
  const resp = await fetch(fnUrl("whatsapp-embedded-signup"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.message || json?.error || `HTTP ${resp.status}`);
  return json as {
    phone_number_id: string;
    waba_id: string;
    display_phone_number: string | null;
    verified_name: string | null;
  };
}
