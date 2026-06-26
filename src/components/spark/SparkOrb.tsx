import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import orbMp4 from "@/assets/spark/orb.mp4";
import orbWebm from "@/assets/spark/orb.webm";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1 reactive scale
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Jarvis-style plasma orb: hemisferio escuro com penas de plasma branco-azuladas
// (referencia: chrysanthemum plasma gif). Movimento real = video loop. Reage as
// falas controlando playbackRate, brilho e escala via `intensity` + `state`.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const isError = state === "error";
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isConnecting = state === "connecting";
  const isActive = isListening || isSpeaking;
  const reactive = isActive ? Math.min(Math.max(intensity, 0), 1) : 0;

  // Playback rate reage a fala. Speaking = mais agitado, listening = leve,
  // idle = bem devagar (parece respirando).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let rate = 0.5;
    if (isSpeaking) rate = 0.9 + reactive * 1.1;       // 0.9 - 2.0
    else if (isListening) rate = 0.7 + reactive * 0.6; // 0.7 - 1.3
    else if (isConnecting) rate = 1.2;
    else rate = 0.45;                                    // idle respirando
    v.playbackRate = Math.max(0.25, Math.min(rate, 2.5));
  }, [isSpeaking, isListening, isConnecting, reactive]);

  // Auto-play robusto (alguns browsers pausam quando muda src/visibilidade).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    v.addEventListener("pause", tryPlay);
    return () => v.removeEventListener("pause", tryPlay);
  }, []);

  const scale = 1 + reactive * 0.06;
  const brightness = 0.85 + reactive * 0.5 + (isSpeaking ? 0.15 : 0);
  const saturate = isError ? 0 : 1;
  // Hue rotate: error = vermelho, default = azul nativo do gif.
  const hueRotate = isError ? 140 : 0;
  const tintRgb = isError ? "239 68 68" : "186 220 255";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center rounded-full overflow-hidden",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-transform duration-300 will-change-transform",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size, transform: `scale(${scale})` }}
    >
      {/* Halo externo difuso — pulsa com a voz */}
      <span
        className={cn(
          "absolute inset-[-15%] rounded-full blur-3xl pointer-events-none transition-opacity duration-500",
          isActive ? "opacity-90" : isConnecting ? "opacity-60" : "opacity-40",
        )}
        style={{
          background: `radial-gradient(circle, rgb(${tintRgb} / ${0.25 + reactive * 0.35}) 0%, transparent 65%)`,
        }}
      />

      {/* Fundo void */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgb(6 8 14) 0%, rgb(2 3 8) 70%, rgb(0 0 2) 100%)",
        }}
      />

      {/* Video plasma — o coração do orbe */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover rounded-full pointer-events-none transition-[filter] duration-300"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          filter: `brightness(${brightness}) saturate(${saturate}) hue-rotate(${hueRotate}deg) contrast(1.05)`,
          mixBlendMode: "screen",
        }}
      >
        <source src={orbWebm} type="video/webm" />
        <source src={orbMp4} type="video/mp4" />
      </video>

      {/* Anel de contorno sutil */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px rgb(${tintRgb} / 0.15), inset 0 0 40px rgb(${tintRgb} / 0.08)`,
        }}
      />

      {/* Feedback rings — listening/speaking */}
      {isListening && (
        <span
          className="absolute inset-0 rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: `rgb(${tintRgb} / 0.4)` }}
        />
      )}
      {isSpeaking && (
        <>
          <span
            className="absolute inset-2 rounded-full border animate-ping pointer-events-none [animation-delay:0ms]"
            style={{ borderColor: `rgb(${tintRgb} / 0.55)` }}
          />
          <span
            className="absolute inset-6 rounded-full border animate-ping pointer-events-none [animation-delay:280ms]"
            style={{ borderColor: `rgb(${tintRgb} / 0.35)` }}
          />
        </>
      )}

      {isConnecting && (
        <span
          className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
          style={{
            boxShadow: `0 0 30px rgb(${tintRgb} / 0.55), inset 0 0 30px rgb(${tintRgb} / 0.3)`,
          }}
        />
      )}
    </button>
  );
}
