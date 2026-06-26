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

// Esfera plasma holográfica do Spark — forma de luz flutuante.
// Mantém paleta blue-white do Aikortex: brilho concentrado nos polos,
// faixas verticais suaves e respiração lenta. Reage ao falar/listen
// aumentando a velocidade, brilho e escala.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const wrapRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Expõe a intensidade via CSS para ajustar escala do halo via variável.
    wrap.style.setProperty("--orb-intensity", String(intensity));
    wrap.style.setProperty("--orb-state", `"${state}"`);
  }, [state, intensity]);

  const isError = state === "error";
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isActive = isSpeaking || isListening;

  const tint = isError ? "239, 68, 68" : "140, 195, 255";
  const white = isError ? "255, 220, 220" : "230, 245, 255";
  const baseAlpha = isError ? "0.16" : "0.18";

  return (
    <button
      ref={wrapRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "spark-orb relative grid place-items-center bg-transparent border-0 p-0 rounded-full",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-transform duration-300",
        disabled && "opacity-60 cursor-not-allowed",
        isActive && "orb-active",
        isSpeaking && "orb-speaking",
        isListening && "orb-listening",
        isError && "orb-error",
      )}
      style={{ width: size, height: size, "--orb-tint": tint, "--orb-white": white, "--orb-base": baseAlpha } as React.CSSProperties}
    >
      {/* Halo externo difuso */}
      <span className="orb-halo absolute inset-0 rounded-full blur-2xl pointer-events-none" />

      {/* Forma de plasma central */}
      <span className="orb-core absolute rounded-full pointer-events-none" />

      {/* Faixas verticais luminosas */}
      <span className="orb-band orb-band-1 absolute rounded-full pointer-events-none" />
      <span className="orb-band orb-band-2 absolute rounded-full pointer-events-none" />
      <span className="orb-band orb-band-3 absolute rounded-full pointer-events-none" />

      {/* Brilho polar (topo) */}
      <span className="orb-pole orb-pole-top absolute rounded-full pointer-events-none" />
      {/* Brilho polar (base) */}
      <span className="orb-pole orb-pole-bottom absolute rounded-full pointer-events-none" />

      {/* Grain sutil */}
      <span className="orb-grain absolute inset-0 rounded-full opacity-20 pointer-events-none mix-blend-overlay" />
    </button>
  );
}
