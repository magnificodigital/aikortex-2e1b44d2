/**
 * StarkVoiceProvider — sessao de voz do Stark GLOBAL, acima do router.
 *
 * POR QUE EXISTE: a sessao morava dentro dos componentes de pagina
 * (StarkInterface no /home, StarkFloatingOrb). Qualquer navegacao que
 * desmontasse o componente derrubava a ligacao — o Stark parava de falar
 * no meio da frase ao trocar de pagina. Aqui o provider nunca desmonta:
 * os orbs viram so "janelas" da mesma sessao.
 *
 * BUNDLE: livekit-client (~300KB) e' importado DINAMICAMENTE dentro do
 * start() — nada de import estatico neste arquivo (ele monta no App root
 * e iria pro bundle principal de todas as paginas).
 */
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Room, RemoteTrack, RemoteAudioTrack, LocalVideoTrack } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { inferPageContext } from "@/lib/stark-page-context";
import { toast } from "sonner";

export type StarkVoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error"
  | "no_credits";

interface StarkVoiceValue {
  status: StarkVoiceStatus;
  /** Audio level 0..1 do agente (orbs pulsam com isso). */
  intensity: number;
  remainingMinutes: number | null;
  error: string | null;
  /** Mic do user silenciado (sessao continua viva). */
  muted: boolean;
  /** Camera ligada — Stark VE o que o user mostra (modulo visao). */
  videoEnabled: boolean;
  /** Track local da camera pro preview (null quando video off). */
  localVideoTrack: LocalVideoTrack | null;
  /** Conecta usando o contexto da pagina ATUAL. No-op se ja conectando/ativo. */
  start: () => void;
  stop: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const StarkVoiceContext = createContext<StarkVoiceValue | null>(null);

// Rotas onde a sessao NAO pode continuar viva:
// - wizard de agente (/aikortex/agents/*): StarkBubble proprio (web speech)
//   assumiria junto — 2 vozes.
// - paginas publicas: user deslogou/saiu do app.
const STOP_PREFIXES = ["/aikortex/agents/", "/cadastro-cliente/"];
const STOP_EXACT = new Set(["/", "/login", "/signup", "/pricing"]);

export function StarkVoiceProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState<StarkVoiceStatus>("idle");
  const [intensity, setIntensity] = useState(0);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  // Path atual sem stale closure (start() e handlers usam o valor vivo).
  const pathRef = useRef(location.pathname);
  useEffect(() => { pathRef.current = location.pathname; }, [location.pathname]);

  const stop = useCallback(() => {
    startingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { /* noop */ });
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect().catch(() => { /* noop */ });
      roomRef.current = null;
    }
    setIntensity(0);
    setMuted(false);
    setVideoEnabled(false);
    setLocalVideoTrack(null);
    setStatus("idle");
  }, []);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    setMuted((prev) => {
      const next = !prev;
      room.localParticipant.setMicrophoneEnabled(!next).catch(() => { /* noop */ });
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    setVideoEnabled((prev) => {
      const next = !prev;
      (async () => {
        try {
          const pub = await room.localParticipant.setCameraEnabled(next);
          setLocalVideoTrack(next ? ((pub?.track as LocalVideoTrack) ?? null) : null);
        } catch (e) {
          console.error("[stark-voice] camera toggle falhou:", e);
          setVideoEnabled(false);
          setLocalVideoTrack(null);
          toast.error("Não consegui acessar a câmera.");
        }
      })();
      return next;
    });
  }, []);

  const start = useCallback(() => {
    if (startingRef.current || roomRef.current) return;
    startingRef.current = true;

    (async () => {
      setStatus("connecting");
      setError(null);

      // 1) Token (checa creditos) — manda o contexto da pagina atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Sessão expirada. Faça login novamente.");
        setStatus("error");
        startingRef.current = false;
        return;
      }

      let tokenResp: Response;
      try {
        tokenResp = await fetch(fnUrl("stark-token"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page_context: inferPageContext(pathRef.current),
          }),
        });
      } catch (e) {
        setError(`Erro de rede: ${(e as Error).message}`);
        setStatus("error");
        startingRef.current = false;
        return;
      }

      if (tokenResp.status === 402) {
        const j = await tokenResp.json().catch(() => ({}));
        setError(j?.message || "Créditos de Stark voz esgotados.");
        setStatus("no_credits");
        startingRef.current = false;
        return;
      }
      if (!tokenResp.ok) {
        const j = await tokenResp.json().catch(() => ({}));
        setError(j?.message || `Erro ${tokenResp.status} obtendo token.`);
        setStatus("error");
        startingRef.current = false;
        return;
      }

      const { token, url, remaining_minutes } = await tokenResp.json();
      setRemainingMinutes(remaining_minutes ?? null);

      // 2) livekit-client so' baixa aqui (chunk separado, sob demanda)
      const { Room: LKRoom, RoomEvent, Track } = await import("livekit-client");

      if (!startingRef.current) return; // stop() chamado durante o await

      const room = new LKRoom({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        roomRef.current = null;
        setIntensity(0);
        setStatus("idle");
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === "no_credits") {
            toast.error(msg.message || "Créditos esgotados.", { duration: 8000 });
            setStatus("no_credits");
            stop();
            return;
          }
          if (msg.type === "navigate") {
            // Stark navegando a UI. Sessao CONTINUA viva — o provider nao
            // desmonta com a troca de rota. So paths internos.
            const path = typeof msg.path === "string" ? msg.path : "";
            if (path.startsWith("/") && !path.startsWith("//")) {
              navigate(path);
            }
            return;
          }
          if (msg.type === "open_agent_creator") {
            // Wizard tem voz propria (StarkBubble) — encerra ANTES de ir.
            const newId = `new-${Date.now()}`;
            stop();
            navigate(`/aikortex/agents/${newId}`, {
              state: {
                fromTemplate: false,
                agentType: "Custom",
                agentName: "Novo Agente",
                initialPrompt: msg.initial_prompt || "",
                starkBubbleMode: "voice",
              },
            });
            return;
          }
        } catch { /* payload nao-JSON, ignora */ }
      });

      // Audio do Stark chegando — anexa no body (sobrevive a navegacao)
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const audioTrack = track as RemoteAudioTrack;
        const audioEl = audioTrack.attach();
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);

        if (!audioContextRef.current) {
          const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
          audioContextRef.current = new Ctx();
        }
        const ctx = audioContextRef.current;
        const mediaStream = audioTrack.mediaStream;
        if (mediaStream && ctx) {
          const source = ctx.createMediaStreamSource(mediaStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
            setIntensity(avg);
            setStatus(avg > 0.04 ? "speaking" : "listening");
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          (track as RemoteAudioTrack).detach().forEach((el) => el.remove());
        }
      });

      // 3) Conecta + publica mic
      try {
        await room.connect(url, token);
        if (!startingRef.current) {
          await room.disconnect();
          roomRef.current = null;
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        setStatus("listening");
      } catch (e) {
        console.error("[stark-voice] connect failed:", e);
        setError(`Não conectou no Stark: ${(e as Error).message}`);
        setStatus("error");
        stop();
      } finally {
        startingRef.current = false;
      }
    })();
  }, [navigate, stop]);

  // Encerra ao entrar em rota incompativel (wizard tem voz propria; paginas
  // publicas = saiu do app). Navegacao entre paginas normais NAO derruba.
  useEffect(() => {
    const p = location.pathname;
    const mustStop = STOP_EXACT.has(p) || STOP_PREFIXES.some((pre) => p.startsWith(pre));
    if (mustStop && (roomRef.current || startingRef.current)) {
      stop();
    }
  }, [location.pathname, stop]);

  return (
    <StarkVoiceContext.Provider
      value={{
        status, intensity, remainingMinutes, error,
        muted, videoEnabled, localVideoTrack,
        start, stop, toggleMute, toggleVideo,
      }}
    >
      {children}
    </StarkVoiceContext.Provider>
  );
}

export function useStarkVoice(): StarkVoiceValue {
  const ctx = useContext(StarkVoiceContext);
  if (!ctx) {
    throw new Error("useStarkVoice precisa estar dentro de <StarkVoiceProvider>");
  }
  return ctx;
}
