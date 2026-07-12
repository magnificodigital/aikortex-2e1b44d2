/**
 * StarkFloatingOrb — janela flutuante da sessao global de voz do Stark.
 *
 * A sessao mora no StarkVoiceProvider (App root) — este componente so'
 * renderiza o estado e dispara start/stop. Navegar entre paginas NAO
 * derruba a ligacao (era o bug: sessao morava no componente).
 *
 * Visual: idle = botao circular discreto; ativo = pill expandida com
 * status, waveform animada pela intensidade real do audio e botao de
 * encerrar. Erro = pill vermelha clicavel pra tentar de novo.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Mic, MicOff, Loader2, AlertTriangle, X, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStarkVoice } from "@/contexts/StarkVoiceContext";
import { useStarkPrefs } from "@/hooks/use-stark-prefs";

// Onde o orb flutuante NAO aparece:
// - /home: StarkInterface tem o orb central (mesma sessao, outra janela)
// - wizard/cadastro: StarkBubble proprio / fluxo publico
// - paginas publicas
const HIDE_EXACT = new Set(["/", "/home", "/login", "/signup", "/pricing"]);
const HIDE_PREFIXES = ["/aikortex/agents/", "/cadastro-cliente/"];

function hidden(pathname: string): boolean {
  if (HIDE_EXACT.has(pathname)) return true;
  return HIDE_PREFIXES.some((p) => pathname.startsWith(p));
}

const STATUS_LABEL: Record<string, string> = {
  connecting: "Conectando…",
  listening: "Ouvindo",
  speaking: "Falando",
};

function CameraPreview() {
  const { localVideoTrack } = useStarkVoice();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !localVideoTrack) return;
    localVideoTrack.attach(el);
    return () => { localVideoTrack.detach(el); };
  }, [localVideoTrack]);

  if (!localVideoTrack) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-primary/30 shadow-xl w-[160px] aspect-video bg-black">
      <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
    </div>
  );
}

export function StarkFloatingOrb() {
  const location = useLocation();
  const { prefs, loading } = useStarkPrefs();
  const {
    status, intensity, error, muted, videoEnabled,
    start, stop, toggleMute, toggleVideo,
  } = useStarkVoice();

  if (loading) return null;
  if (!prefs.bubble_enabled) return null;
  if (hidden(location.pathname)) return null;

  const isActive = status === "connecting" || status === "listening" || status === "speaking";
  const isError = status === "error" || status === "no_credits";

  // ── Erro: pill vermelha, clica pra tentar de novo ──
  if (isError) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={start}
          title={error || "Erro no Stark — clique pra tentar de novo"}
          className="flex items-center gap-2 rounded-full bg-destructive/90 text-destructive-foreground shadow-xl backdrop-blur px-4 h-12 text-xs font-medium hover:bg-destructive transition"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="max-w-[180px] truncate">{error || "Erro — tentar de novo"}</span>
        </button>
      </div>
    );
  }

  // ── Ativo: pill expandida com waveform + controles ──
  if (isActive) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {videoEnabled && <CameraPreview />}
        <div className="flex items-center gap-3 rounded-full border border-primary/30 bg-background/80 backdrop-blur-md shadow-xl pl-4 pr-2 h-14">
          {/* Dot de status com pulso */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {status !== "connecting" && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
            )}
            <span className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full",
              status === "connecting" ? "bg-amber-400" : "bg-primary",
            )} />
          </span>

          {/* Waveform — 5 barras dirigidas pela intensidade real */}
          <div className="flex items-center gap-[3px] h-6" aria-hidden>
            {[0.6, 1, 0.8, 1, 0.6].map((mult, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-primary transition-all duration-75"
                style={{
                  height: status === "speaking"
                    ? `${Math.max(4, Math.min(24, intensity * 90 * mult))}px`
                    : status === "listening"
                    ? "4px"
                    : "4px",
                  opacity: status === "connecting" ? 0.3 : 0.9,
                }}
              />
            ))}
          </div>

          <span className="text-xs font-medium text-foreground min-w-[72px]">
            {status === "connecting" ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> {STATUS_LABEL.connecting}
              </span>
            ) : (
              STATUS_LABEL[status]
            )}
          </span>

          {/* Controles: mute, video, encerrar */}
          <button
            onClick={toggleMute}
            title={muted ? "Reativar microfone" : "Silenciar microfone"}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition shrink-0",
              muted ? "bg-destructive/15 text-destructive hover:bg-destructive/25" : "hover:bg-muted",
            )}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            title={videoEnabled ? "Desligar câmera" : "Ligar câmera — Stark vê o que você mostrar"}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition shrink-0",
              videoEnabled ? "bg-primary/15 text-primary hover:bg-primary/25" : "hover:bg-muted",
            )}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button
            onClick={stop}
            title="Encerrar Stark"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Idle: botao circular discreto ──
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={start}
        title="Falar com Stark"
        className={cn(
          "group relative w-14 h-14 rounded-full shadow-xl transition-all duration-200",
          "bg-background/80 backdrop-blur-md border border-border",
          "hover:border-primary/50 hover:scale-105",
          "flex items-center justify-center",
        )}
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Mic className="w-5 h-5 text-foreground group-hover:text-primary transition-colors relative" />
      </button>
    </div>
  );
}
