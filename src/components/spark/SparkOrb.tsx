import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1 reactive scale
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Astro-orb: void escuro com anel circular visivel, 2 polos brancos
// brilhantes (12h e 6h) e streaks verticais laterais. Espelha a referencia
// astrofotografica em paleta neutra Aikortex (branco/silver sobre near-black).
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isActive = state === "listening" || state === "speaking";
  const isError = state === "error";
  const reactive = isActive ? Math.min(intensity, 1) : 0;
  const scale = 1 + reactive * 0.05;

  const poleAlpha = 0.7 + reactive * 0.3;
  const sideAlpha = 0.22 + reactive * 0.25;

  // Paleta Aikortex: branco frio neutro. Error vira vermelho frio.
  const tint = isError ? "239 68 68" : "226 232 240"; // slate-200

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center rounded-full",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-transform duration-200 will-change-transform",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size, transform: `scale(${scale})` }}
    >
      {/* 1. Fundo void — near-black com leve gradient */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgb(8 10 16) 0%, rgb(3 4 9) 65%, rgb(0 0 3) 100%)",
        }}
      />

      {/* 2. Halo externo difuso */}
      <span
        className={cn(
          "absolute inset-[-10%] rounded-full blur-3xl pointer-events-none transition-opacity duration-500",
          isActive ? "opacity-80" : "opacity-45",
        )}
        style={{
          background: `radial-gradient(circle, rgb(${tint} / 0.28) 0%, transparent 65%)`,
        }}
      />

      {/* 3. Anel circular — contorno principal da esfera (faint glow ring) */}
      <span
        className="absolute inset-[12%] rounded-full pointer-events-none"
        style={{
          boxShadow: `
            inset 0 0 0 1px rgb(${tint} / 0.18),
            inset 0 0 40px rgb(${tint} / 0.12),
            0 0 30px rgb(${tint} / 0.1)
          `,
        }}
      />

      {/* 4. Streak vertical esquerdo — fino e suave */}
      <span
        className="absolute pointer-events-none blur-[3px]"
        style={{
          left: `${size * 0.14}px`,
          top: `${size * 0.22}px`,
          width: `${size * 0.025}px`,
          height: `${size * 0.56}px`,
          background: `linear-gradient(to bottom, transparent 0%, rgb(${tint} / ${sideAlpha}) 40%, rgb(${tint} / ${sideAlpha * 0.85}) 60%, transparent 100%)`,
          borderRadius: "50%",
        }}
      />

      {/* 5. Streak vertical direito */}
      <span
        className="absolute pointer-events-none blur-[3px]"
        style={{
          right: `${size * 0.14}px`,
          top: `${size * 0.22}px`,
          width: `${size * 0.025}px`,
          height: `${size * 0.56}px`,
          background: `linear-gradient(to bottom, transparent 0%, rgb(${tint} / ${sideAlpha}) 40%, rgb(${tint} / ${sideAlpha * 0.85}) 60%, transparent 100%)`,
          borderRadius: "50%",
        }}
      />

      {/* 6. POLO SUPERIOR — arco luminoso largo */}
      <span
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          top: `${size * 0.09}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${size * 0.6}px`,
          height: `${size * 0.16}px`,
          background: `radial-gradient(ellipse at center bottom, rgb(${tint} / ${poleAlpha}) 0%, rgb(${tint} / ${poleAlpha * 0.5}) 35%, transparent 75%)`,
          filter: "blur(5px)",
          borderRadius: "50%",
        }}
      />
      {/* 6b. Hot spot superior — nucleo branco quente */}
      <span
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          top: `${size * 0.13}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${size * 0.32}px`,
          height: `${size * 0.06}px`,
          background: `radial-gradient(ellipse at center, rgba(255,255,255,${0.85 + reactive * 0.15}) 0%, rgb(${tint} / 0.5) 45%, transparent 80%)`,
          filter: "blur(2px)",
          borderRadius: "50%",
        }}
      />

      {/* 7. POLO INFERIOR — espelhado */}
      <span
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          bottom: `${size * 0.09}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${size * 0.6}px`,
          height: `${size * 0.16}px`,
          background: `radial-gradient(ellipse at center top, rgb(${tint} / ${poleAlpha}) 0%, rgb(${tint} / ${poleAlpha * 0.5}) 35%, transparent 75%)`,
          filter: "blur(5px)",
          borderRadius: "50%",
        }}
      />
      {/* 7b. Hot spot inferior */}
      <span
        className="absolute pointer-events-none transition-all duration-300"
        style={{
          bottom: `${size * 0.13}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: `${size * 0.32}px`,
          height: `${size * 0.06}px`,
          background: `radial-gradient(ellipse at center, rgba(255,255,255,${0.85 + reactive * 0.15}) 0%, rgb(${tint} / 0.5) 45%, transparent 80%)`,
          filter: "blur(2px)",
          borderRadius: "50%",
        }}
      />

      {/* 8. Grain noise — textura astrofoto */}
      <svg
        className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay pointer-events-none"
        width="100%" height="100%"
      >
        <filter id={`spark-grain-${size}`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.8  0 0 0 0 0.85  0 0 0 0 0.95  0 0 0 0.55 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#spark-grain-${size})`} />
      </svg>

      {/* 9. Aneis pulsantes — feedback de listening/speaking */}
      {state === "listening" && (
        <span
          className="absolute inset-0 rounded-full border animate-ping"
          style={{ borderColor: `rgb(${tint} / 0.4)` }}
        />
      )}
      {state === "speaking" && (
        <>
          <span
            className="absolute inset-2 rounded-full border animate-ping [animation-delay:0ms]"
            style={{ borderColor: `rgb(${tint} / 0.5)` }}
          />
          <span
            className="absolute inset-5 rounded-full border animate-ping [animation-delay:280ms]"
            style={{ borderColor: `rgb(${tint} / 0.35)` }}
          />
        </>
      )}

      {/* 10. Connecting — pulse no anel todo */}
      {state === "connecting" && (
        <span
          className="absolute inset-[12%] rounded-full animate-pulse pointer-events-none"
          style={{
            boxShadow: `0 0 25px rgb(${tint} / 0.5), inset 0 0 25px rgb(${tint} / 0.3)`,
          }}
        />
      )}
    </button>
  );
}
