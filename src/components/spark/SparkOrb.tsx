import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Spark Orb — forma pura de luz plasma flutuante.
// Sem HUD, anéis, partículas ou texto. Apenas volumetric light blue-white
// com bordas irregulares, faixas verticais e brilho concentrado nos polos.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.style.setProperty("--orb-intensity", String(intensity));
  }, [intensity]);

  const isError = state === "error";
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isActive = isSpeaking || isListening;

  const tint = isError ? "239, 68, 68" : "140, 195, 255";
  const white = isError ? "255, 220, 220" : "230, 245, 255";

  return (
    <div
      ref={wrapRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Spark voice toggle"
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "spark-orb relative grid place-items-center rounded-full cursor-pointer",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        disabled && "opacity-60 cursor-not-allowed",
        isActive && "orb-active",
        isSpeaking && "orb-speaking",
        isListening && "orb-listening",
        isError && "orb-error",
      )}
      style={{ width: size, height: size, "--orb-tint": tint, "--orb-white": white } as React.CSSProperties}
    >
      {/* Glow ambiente externo */}
      <span className="orb-ambient absolute inset-[-20%] rounded-full pointer-events-none" />

      {/* Forma de plasma com bordas irregulares */}
      <span className="orb-cloud absolute rounded-full pointer-events-none" />

      {/* Faixas verticais luminosas */}
      <span className="orb-band orb-band-1 absolute rounded-full pointer-events-none" />
      <span className="orb-band orb-band-2 absolute rounded-full pointer-events-none" />
      <span className="orb-band orb-band-3 absolute rounded-full pointer-events-none" />

      {/* Brilho polar topo */}
      <span className="orb-pole orb-pole-top absolute rounded-full pointer-events-none" />
      {/* Brilho polar base */}
      <span className="orb-pole orb-pole-bottom absolute rounded-full pointer-events-none" />
    </div>
  );
}
