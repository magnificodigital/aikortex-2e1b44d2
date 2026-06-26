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

// Spark Orb — versão Jarvis: núcleo de plasma blue-white Aikortex
// com anéis concêntricos pulsantes, micro points e ondas de scan.
// Mantém as cores do tema atual, mas acelera e adiciona geometria tecnológica.
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
  const isConnecting = state === "connecting";
  const isActive = isSpeaking || isListening || isConnecting;

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
        isConnecting && "orb-connecting",
        isError && "orb-error",
      )}
      style={{ width: size, height: size, "--orb-tint": tint, "--orb-white": white } as React.CSSProperties}
    >
      {/* Aura externa pulsante */}
      <span className="orb-aura absolute inset-[-35%] rounded-full pointer-events-none" />

      {/* Anéis concêntricos pulsantes estilo Jarvis */}
      <svg className="orb-rings absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 260" fill="none">
        <circle cx="130" cy="130" r="122" className="orb-ring orb-ring-1" />
        <circle cx="130" cy="130" r="104" className="orb-ring orb-ring-2" />
        <circle cx="130" cy="130" r="86" className="orb-ring orb-ring-3" />
        {/* Arcos de scan */}
        <path d="M 130 28 A 102 102 0 0 1 232 130" className="orb-arc orb-arc-1" />
        <path d="M 130 232 A 102 102 0 0 1 28 130" className="orb-arc orb-arc-2" />
      </svg>

      {/* HUD de micro points ao redor — explosão sutil radial */}
      <svg className="orb-hud absolute inset-[-22%] w-[144%] h-[144%] pointer-events-none" viewBox="0 0 260 260" fill="none">
        {[...Array(72)].map((_, i) => {
          const angle = (i * 5) * (Math.PI / 180);
          const radius = 108 + (i % 5) * 14 + (i % 7) * 3;
          const cx = 130 + Math.cos(angle) * radius;
          const cy = 130 + Math.sin(angle) * radius;
          const r = 0.9 + (i % 3) * 0.45;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              className="orb-point"
              style={{ animationDelay: `${(i * 0.08).toFixed(2)}s` }}
            />
          );
        })}
      </svg>

      {/* Onda de scan radial */}
      <span className="orb-scan absolute rounded-full pointer-events-none" />

      {/* Núcleo de plasma com bordas irregulares */}
      <span className="orb-core absolute rounded-full pointer-events-none" />
      <span className="orb-cloud absolute rounded-full pointer-events-none" />

      {/* Faixas verticais luminosas */}
      <span className="orb-band orb-band-1 absolute rounded-full pointer-events-none" style={{ "--band-x": "-24px" } as React.CSSProperties} />
      <span className="orb-band orb-band-2 absolute rounded-full pointer-events-none" style={{ "--band-x": "0px" } as React.CSSProperties} />
      <span className="orb-band orb-band-3 absolute rounded-full pointer-events-none" style={{ "--band-x": "24px" } as React.CSSProperties} />

      {/* Brilhos polares topo/base */}
      <span className="orb-pole orb-pole-top absolute rounded-full pointer-events-none" />
      <span className="orb-pole orb-pole-bottom absolute rounded-full pointer-events-none" />
    </div>
  );
}
