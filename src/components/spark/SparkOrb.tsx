import { cn } from "@/lib/utils";
import orbAsset from "@/assets/spark/orb-image.png.asset.json";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1 reactive scale
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Spark voice visual: imagem branda do Aikortex animada via filtros e halo.
// Reage à voz através de scale + brightness + glow (sem círculo extra atrás).
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isError = state === "error";
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isConnecting = state === "connecting";
  const isActive = isListening || isSpeaking;
  const reactive = isActive ? Math.min(Math.max(intensity, 0), 1) : 0;

  // Animação contínua sutil quando idle (respiração).
  const baseScale = 1 + reactive * 0.08;
  const brightness = 0.95 + reactive * 0.4 + (isSpeaking ? 0.1 : 0);
  const saturate = isError ? 0 : 1;
  const hueRotate = isError ? 140 : 0;
  // Aikortex: tons neutros (silver/branco frio). Erro = vermelho.
  const tintRgb = isError ? "239 68 68" : "220 228 240";

  // Velocidade do pulse muda com o estado.
  const pulseClass = isSpeaking
    ? "animate-[pulse_1.2s_ease-in-out_infinite]"
    : isListening
      ? "animate-[pulse_2s_ease-in-out_infinite]"
      : isConnecting
        ? "animate-[pulse_1.5s_ease-in-out_infinite]"
        : "animate-[pulse_4s_ease-in-out_infinite]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center bg-transparent border-0 p-0",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-full",
        "transition-transform duration-500 will-change-transform",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size, transform: `scale(${baseScale})` }}
    >
      {/* Halo difuso reativo */}
      <span
        className={cn(
          "absolute inset-[-20%] rounded-full blur-3xl pointer-events-none transition-opacity duration-500",
          isActive ? "opacity-90" : isConnecting ? "opacity-60" : "opacity-40",
        )}
        style={{
          background: `radial-gradient(circle, rgb(${tintRgb} / ${0.28 + reactive * 0.4}) 0%, transparent 65%)`,
        }}
      />

      {/* Glow interno suave */}
      <span
        className={cn("absolute inset-[-5%] rounded-full blur-2xl pointer-events-none", pulseClass)}
        style={{
          background: `radial-gradient(circle, rgb(${tintRgb} / ${0.18 + reactive * 0.25}) 0%, transparent 70%)`,
        }}
      />

      {/* Imagem central — sem fundo, sem moldura */}
      <img
        src={orbAsset.url}
        alt=""
        aria-hidden
        draggable={false}
        className={cn(
          "relative w-full h-full object-contain select-none pointer-events-none transition-[filter,transform] duration-300",
          pulseClass,
        )}
        style={{
          filter: `brightness(${brightness}) saturate(${saturate}) hue-rotate(${hueRotate}deg) drop-shadow(0 0 ${20 + reactive * 40}px rgb(${tintRgb} / ${0.45 + reactive * 0.4}))`,
        }}
      />

      {/* Feedback rings discretos */}
      {isListening && (
        <span
          className="absolute inset-[8%] rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: `rgb(${tintRgb} / 0.35)` }}
        />
      )}
      {isSpeaking && (
        <>
          <span
            className="absolute inset-[4%] rounded-full border animate-ping pointer-events-none"
            style={{ borderColor: `rgb(${tintRgb} / 0.45)` }}
          />
          <span
            className="absolute inset-[16%] rounded-full border animate-ping pointer-events-none [animation-delay:300ms]"
            style={{ borderColor: `rgb(${tintRgb} / 0.3)` }}
          />
        </>
      )}
    </button>
  );
}
