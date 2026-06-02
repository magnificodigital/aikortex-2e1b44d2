import { useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fnUrl } from "@/lib/supabase-url";
import { supabase } from "@/integrations/supabase/client";

type Scope = "google_calendar" | "google_sheets" | "google_drive" | "gmail";

const SCOPE_LABELS: Record<Scope, { label: string; icon: string }> = {
  google_calendar: { label: "Conectar Google Calendar", icon: "📅" },
  google_sheets: { label: "Conectar Google Sheets", icon: "📊" },
  google_drive: { label: "Conectar Google Drive", icon: "💾" },
  gmail: { label: "Conectar Gmail", icon: "✉️" },
};

interface InlineOAuthButtonProps {
  scope: Scope;
  agentId?: string;
  /** Callback quando OAuth completa com sucesso. Wizard usa pra retomar conversa. */
  onConnected?: (scope: Scope) => void;
}

/**
 * Botão inline no chat pra conectar conta Google sem sair do fluxo.
 * Abre popup, escuta postMessage da callback page, fecha popup quando
 * recebe sucesso e dispara onConnected pro wizard prosseguir.
 */
export default function InlineOAuthButton({ scope, agentId, onConnected }: InlineOAuthButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "connected" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const watcherRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const info = SCOPE_LABELS[scope];

  // Escuta postMessage da popup
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (typeof data.success !== "boolean") return;
      if (data.scope && data.scope !== scope) return;

      if (watcherRef.current) {
        clearInterval(watcherRef.current);
        watcherRef.current = null;
      }
      try { popupRef.current?.close(); } catch { /* ignore */ }

      if (data.success) {
        setState("connected");
        onConnected?.(scope);
      } else {
        setState("error");
        setErrorMsg(data.error || "Erro ao conectar");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [scope, onConnected]);

  // Limpa watcher ao desmontar
  useEffect(() => () => {
    if (watcherRef.current) clearInterval(watcherRef.current);
  }, []);

  const handleClick = async () => {
    setState("loading");
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada — faça login novamente");

      const resp = await fetch(fnUrl("google-oauth-start"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ scope, agentId }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.authUrl) {
        throw new Error(json.message || json.error || "Erro ao iniciar OAuth");
      }

      // Abre popup 500x700 centralizada
      const w = 500, h = 700;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      const popup = window.open(
        json.authUrl,
        "google_oauth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) {
        throw new Error("Popup bloqueado — permita popups pra esse site");
      }
      popupRef.current = popup;

      // Vigia se o user fechou a popup sem completar
      watcherRef.current = setInterval(() => {
        if (popup.closed) {
          if (watcherRef.current) clearInterval(watcherRef.current);
          watcherRef.current = null;
          // Se ainda estamos em loading, user cancelou
          setState((s) => (s === "loading" ? "idle" : s));
        }
      }, 500);
    } catch (e: any) {
      setState("error");
      setErrorMsg(e?.message || "Erro inesperado");
    }
  };

  if (state === "connected") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs">
        <Check className="w-3.5 h-3.5" />
        <span className="font-medium">Conectado!</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button
        size="sm"
        onClick={handleClick}
        disabled={state === "loading"}
        className="gap-2 bg-primary hover:bg-primary/90"
      >
        {state === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <span>{info.icon}</span>
        )}
        {state === "loading" ? "Abrindo Google..." : info.label}
      </Button>
      {state === "error" && errorMsg && (
        <p className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertTriangle className="w-3 h-3" /> {errorMsg}
        </p>
      )}
    </div>
  );
}
