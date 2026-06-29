/**
 * useStarkLiveKit — conecta o Stark via LiveKit Agents (Fase 3).
 *
 * Substitui o fluxo legacy (MediaRecorder + stark-voice edge function) por:
 *   1. Pega JWT em `stark-token` (que tambem checa creditos)
 *   2. Conecta no LiveKit Room (sala unica por user)
 *   3. Publica mic audio
 *   4. Subscribe aos audio tracks do agente (Stark fala)
 *   5. Escuta data messages (ex: no_credits → fecha sessao)
 *
 * Stark Agent (Python, Railway) escuta o room, faz pipeline streaming
 * STT → LLM → TTS e responde com audio sub-segundo de latencia.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteAudioTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";

export type StarkLiveKitState =
  | "idle"
  | "connecting"
  | "listening"   // user pode falar (silencio)
  | "speaking"    // agente esta falando (TTS chegando)
  | "error"
  | "no_credits";

interface UseStarkLiveKitOptions {
  /** Quando true, conecta. Quando false, desconecta + cleanup. */
  active: boolean;
  /** Callback quando o agente termina uma frase (pra logica externa
   *  saber se deve trocar de pagina, etc). */
  onAgentSpoke?: (text: string) => void;
}

interface UseStarkLiveKitReturn {
  state: StarkLiveKitState;
  /** Audio level 0..1 do agente (pro orb pulsar). */
  intensity: number;
  /** Minutos restantes (tier + packs), atualiza no connect. */
  remainingMinutes: number | null;
  /** Forca disconnect. */
  disconnect: () => void;
  /** Mensagem de erro humana (quando state==='error'). */
  error: string | null;
}

export function useStarkLiveKit({
  active,
  onAgentSpoke: _onAgentSpoke,
}: UseStarkLiveKitOptions): UseStarkLiveKitReturn {
  const navigate = useNavigate();
  const [state, setState] = useState<StarkLiveKitState>("idle");
  const [intensity, setIntensity] = useState(0);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const disconnect = useCallback(() => {
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
    setState("idle");
  }, []);

  // Conecta quando active vira true.
  useEffect(() => {
    if (!active) {
      disconnect();
      return;
    }
    let cancelled = false;

    (async () => {
      setState("connecting");
      setError(null);

      // 1) Pega token via edge function (autenticado)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (cancelled) return;
        setError("Sessão expirada. Faça login novamente.");
        setState("error");
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
          body: JSON.stringify({}),
        });
      } catch (e) {
        if (cancelled) return;
        setError(`Erro de rede: ${(e as Error).message}`);
        setState("error");
        return;
      }

      if (cancelled) return;

      if (tokenResp.status === 402) {
        const j = await tokenResp.json().catch(() => ({}));
        setError(j?.message || "Créditos de Stark voz esgotados.");
        setState("no_credits");
        return;
      }
      if (!tokenResp.ok) {
        const j = await tokenResp.json().catch(() => ({}));
        setError(j?.message || `Erro ${tokenResp.status} obtendo token.`);
        setState("error");
        return;
      }

      const { token, url, remaining_minutes } = await tokenResp.json();
      if (cancelled) return;
      setRemainingMinutes(remaining_minutes ?? null);

      // 2) Cria Room + listeners ANTES de conectar
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => {
        if (cancelled) return;
        setState("idle");
        setIntensity(0);
      });

      room.on(RoomEvent.ConnectionStateChanged, (cs) => {
        // Mantemos visivel — debug
        console.log("[stark-livekit] connection state:", cs);
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const text = new TextDecoder().decode(payload);
          const msg = JSON.parse(text);
          if (msg.type === "no_credits") {
            toast.error(msg.message || "Créditos esgotados.", { duration: 8000 });
            setState("no_credits");
            disconnect();
            return;
          }
          if (msg.type === "open_agent_creator") {
            // Stark pediu pra abrir o wizard. Mesma rota do Home.navigateToNewAgent.
            const newId = `new-${Date.now()}`;
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
        } catch {
          // payload nao-JSON, ignora
        }
      });

      // Audio remoto (Stark falando) — conecta no analyser pra orb pulsar
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
        if (track.kind !== Track.Kind.Audio) return;
        const audioTrack = track as RemoteAudioTrack;
        // Anexa elemento de audio invisivel pra reproduzir
        const audioEl = audioTrack.attach();
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);

        // Setup analyser pra intensity
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
            setState(avg > 0.04 ? "speaking" : "listening");
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          const audioTrack = track as RemoteAudioTrack;
          audioTrack.detach().forEach((el) => el.remove());
        }
      });

      // 3) Conecta + publica mic
      try {
        await room.connect(url, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        setState("listening");
      } catch (e) {
        if (cancelled) return;
        console.error("[stark-livekit] connect failed:", e);
        setError(`Não conectou no Stark: ${(e as Error).message}`);
        setState("error");
        disconnect();
      }
    })();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [active, disconnect]);

  return { state, intensity, remainingMinutes, disconnect, error };
}
