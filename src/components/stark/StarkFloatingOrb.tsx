/**
 * StarkFloatingOrb — bubble flutuante do Stark Voice (LiveKit) pra
 * todas as paginas autenticadas.
 *
 * Regras de exibicao (delegadas pro mount em App.tsx):
 *  - bubble_enabled = true (prefs do user)
 *  - NAO mostra em /home (StarkInterface ja' tem o orb central)
 *  - NAO mostra em /aikortex/agents/* (AgentDetail monta StarkBubble proprio do wizard)
 *  - NAO mostra em rotas publicas (/, /pricing, /login)
 *
 * UX:
 *  - Idle: orb dim, click pra conectar
 *  - Connecting/Listening/Speaking: orb com glow + animacao
 *  - Erro / sem creditos: orb vermelho + toast
 *  - Click no orb ativo = desconecta
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStarkLiveKit } from "@/hooks/use-stark-livekit";
import { useStarkPrefs } from "@/hooks/use-stark-prefs";

// Paths onde NAO mostrar (interface propria do Stark ja' ocupa).
const SKIP_EXACT = new Set(["/", "/home", "/login", "/signup", "/pricing"]);
const SKIP_PREFIXES = ["/aikortex/agents/", "/cadastro-cliente/"];

function shouldShow(pathname: string): boolean {
  if (SKIP_EXACT.has(pathname)) return false;
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) return false;
  return true;
}

export function StarkFloatingOrb() {
  const location = useLocation();
  const { prefs, loading } = useStarkPrefs();
  const [active, setActive] = useState(false);

  const livekit = useStarkLiveKit({ active });

  // Reseta active quando muda de rota (evita carregar conexao pra pagina nova)
  useEffect(() => {
    setActive(false);
  }, [location.pathname]);

  // Esconde quando hook reporta erro de credito (UX evita reabertura imediata)
  useEffect(() => {
    if (livekit.state === "no_credits") setActive(false);
  }, [livekit.state]);

  if (loading) return null;
  if (!prefs.bubble_enabled) return null;
  if (!shouldShow(location.pathname)) return null;

  const isBusy = livekit.state === "connecting";
  const isOn = active && (livekit.state === "listening" || livekit.state === "speaking" || livekit.state === "connecting");
  const isError = livekit.state === "error" || livekit.state === "no_credits";

  const intensity = livekit.intensity || 0;
  const scale = 1 + (isOn ? intensity * 0.35 : 0);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-2">
      {isOn && (
        <button
          onClick={() => setActive(false)}
          className="w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition"
          title="Desligar Stark"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={() => setActive(v => !v)}
        disabled={isBusy}
        className={cn(
          "relative w-14 h-14 rounded-full transition-all duration-200 shadow-xl",
          "flex items-center justify-center",
          isOn   && "bg-primary text-primary-foreground",
          !isOn && !isError && "bg-card border border-border hover:bg-primary/10 hover:border-primary/40 text-foreground",
          isError && "bg-destructive/90 text-destructive-foreground",
        )}
        style={{ transform: `scale(${scale.toFixed(2)})` }}
        title={
          isError ? (livekit.error || "Erro no Stark") :
          isOn    ? "Falando com Stark — clique pra parar" :
                    "Falar com Stark"
        }
      >
        {isError ? (
          <AlertTriangle className="w-5 h-5" />
        ) : isBusy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}

        {isOn && livekit.state === "listening" && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping" />
        )}
      </button>
    </div>
  );
}
