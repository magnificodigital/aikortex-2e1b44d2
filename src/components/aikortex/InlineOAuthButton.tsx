import { useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fnUrl } from "@/lib/supabase-url";
import { supabase } from "@/integrations/supabase/client";

type Scope =
  | "google_calendar" | "google_sheets" | "google_drive" | "gmail"
  | "hubspot" | "calendly" | "notion" | "slack"
  | "airtable" | "asana" | "trello" | "clickup"
  | "discord" | "dropbox" | "github" | "linkedin" | "zoom";

const SCOPE_LABELS: Record<Scope, { label: string; icon: string }> = {
  google_calendar: { label: "Conectar Google Calendar", icon: "📅" },
  google_sheets: { label: "Conectar Google Sheets", icon: "📊" },
  google_drive: { label: "Conectar Google Drive", icon: "💾" },
  gmail: { label: "Conectar Gmail", icon: "✉️" },
  hubspot: { label: "Conectar HubSpot", icon: "🟧" },
  calendly: { label: "Conectar Calendly", icon: "🗓️" },
  notion: { label: "Conectar Notion", icon: "📝" },
  slack: { label: "Conectar Slack", icon: "💬" },
  airtable: { label: "Conectar Airtable", icon: "🗂️" },
  asana: { label: "Conectar Asana", icon: "✅" },
  trello: { label: "Conectar Trello", icon: "📋" },
  clickup: { label: "Conectar ClickUp", icon: "🆙" },
  discord: { label: "Conectar Discord", icon: "🎮" },
  dropbox: { label: "Conectar Dropbox", icon: "📦" },
  github: { label: "Conectar GitHub", icon: "🐙" },
  linkedin: { label: "Conectar LinkedIn", icon: "💼" },
  zoom: { label: "Conectar Zoom", icon: "🎥" },
};

interface InlineOAuthButtonProps {
  scope: Scope;
  agentId?: string;
  /** Callback quando OAuth completa com sucesso. Wizard usa pra retomar conversa. */
  onConnected?: (scope: Scope) => void;
}

/**
 * Botão inline no chat pra conectar conta via Composio (managed OAuth pra ~250 providers).
 * Fluxo: clica → backend chama Composio → recebe redirectUrl → abre popup →
 * polling em composio-status detecta ACTIVE → fecha popup → dispara onConnected.
 */
export default function InlineOAuthButton({ scope, agentId, onConnected }: InlineOAuthButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "connected" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const watcherRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const info = SCOPE_LABELS[scope];

  // Ao montar, checa se já está conectado. Mensagens antigas do wizard ficam
  // no histórico do chat com o botão original — sem isso, user que conectou
  // depois vê "Conectar" eternamente em vez de "Conectado".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const resp = await fetch(fnUrl("composio-status"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ provider: scope }),
        });
        const json = await resp.json();
        if (!cancelled && json?.connected) {
          setState("connected");
        }
      } catch { /* silencioso — fallback é botão idle */ }
    })();
    return () => { cancelled = true; };
  }, [scope]);

  // Polling em composio-status enquanto em loading. Quando ACTIVE → fecha popup,
  // marca connected, dispara onConnected. Composio não posta mensagem pra nós,
  // então polling é o único caminho confiável de detecção.
  useEffect(() => {
    if (state !== "loading") return;
    const poll = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const resp = await fetch(fnUrl("composio-status"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ provider: scope }),
        });
        const json = await resp.json();
        if (json?.connected) {
          setState("connected");
          try { popupRef.current?.close(); } catch { /* ignore */ }
          onConnected?.(scope);
        }
      } catch (e) {
        console.debug("[composio poll]", e);
      }
    };
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [state, scope, onConnected]);

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

      const resp = await fetch(fnUrl("composio-connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ provider: scope, agentId }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.redirectUrl) {
        throw new Error(json.message || json.error || "Erro ao iniciar conexão");
      }

      const w = 500, h = 700;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      const popup = window.open(
        json.redirectUrl,
        "composio_oauth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) {
        throw new Error("Popup bloqueado — permita popups pra esse site");
      }
      popupRef.current = popup;

      // Vigia popup fechada sem completar (user cancelou)
      watcherRef.current = setInterval(() => {
        if (popup.closed) {
          if (watcherRef.current) clearInterval(watcherRef.current);
          watcherRef.current = null;
          setState((s) => (s === "loading" ? "idle" : s));
        }
      }, 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      setState("error");
      setErrorMsg(msg);
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
        {state === "loading" ? "Abrindo conexão..." : info.label}
      </Button>
      {state === "error" && errorMsg && (
        <p className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertTriangle className="w-3 h-3" /> {errorMsg}
        </p>
      )}
    </div>
  );
}
