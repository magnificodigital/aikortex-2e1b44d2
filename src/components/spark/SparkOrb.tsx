import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Jarvis-style holographic orb: anéis orbitais rotativos, núcleo plasma,
// partículas e HUD ticks — paleta Aikortex (silver/cyan frio).
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isError = state === "error";
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isConnecting = state === "connecting";
  const isActive = isListening || isSpeaking;
  const reactive = isActive ? Math.min(Math.max(intensity, 0), 1) : 0;

  const coreScale = 1 + reactive * 0.18;
  const glow = 0.5 + reactive * 0.6;
  const ringSpeedFast = isSpeaking ? "6s" : isListening ? "10s" : isConnecting ? "8s" : "22s";
  const ringSpeedMed = isSpeaking ? "9s" : isListening ? "14s" : isConnecting ? "11s" : "30s";
  const ringSpeedSlow = isSpeaking ? "14s" : isListening ? "20s" : isConnecting ? "16s" : "45s";

  const tint = isError ? "239 68 68" : "150 200 255"; // cyan-ice Aikortex
  const tintSoft = isError ? "248 113 113" : "200 220 245";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center bg-transparent border-0 p-0 rounded-full",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-transform duration-500",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size, perspective: `${size * 3}px` }}
    >
      {/* Halo externo difuso */}
      <span
        className="absolute inset-[-25%] rounded-full blur-3xl pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, rgb(${tint} / ${0.18 + reactive * 0.35}) 0%, transparent 65%)`,
          opacity: isActive ? 1 : isConnecting ? 0.75 : 0.5,
        }}
      />

      {/* HUD ticks externos (anel marcado) */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ animation: `jarvis-spin ${ringSpeedSlow} linear infinite reverse` }}
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const long = i % 5 === 0;
          return (
            <line
              key={i}
              x1="50"
              y1={long ? 2 : 3}
              x2="50"
              y2={long ? 5.5 : 4.5}
              stroke={`rgb(${tint})`}
              strokeOpacity={long ? 0.7 : 0.3}
              strokeWidth={long ? 0.4 : 0.2}
              transform={`rotate(${i * 6} 50 50)`}
            />
          );
        })}
      </svg>

      {/* Anel orbital 1 — tilt X */}
      <span
        className="absolute inset-[6%] rounded-full pointer-events-none"
        style={{
          border: `1px solid rgb(${tint} / 0.45)`,
          boxShadow: `0 0 ${10 + reactive * 20}px rgb(${tint} / 0.4), inset 0 0 ${10 + reactive * 20}px rgb(${tint} / 0.2)`,
          transform: "rotateX(72deg)",
          animation: `jarvis-spin ${ringSpeedFast} linear infinite`,
        }}
      />
      {/* Anel orbital 2 — tilt Y */}
      <span
        className="absolute inset-[10%] rounded-full pointer-events-none"
        style={{
          border: `1px solid rgb(${tintSoft} / 0.5)`,
          boxShadow: `0 0 ${8 + reactive * 16}px rgb(${tint} / 0.35)`,
          transform: "rotateY(72deg)",
          animation: `jarvis-spin ${ringSpeedMed} linear infinite reverse`,
        }}
      />
      {/* Anel orbital 3 — diagonal */}
      <span
        className="absolute inset-[14%] rounded-full pointer-events-none"
        style={{
          border: `1px dashed rgb(${tint} / 0.35)`,
          transform: "rotate3d(1, 1, 0, 70deg)",
          animation: `jarvis-spin ${ringSpeedMed} linear infinite`,
        }}
      />
      {/* Anel orbital 4 — outro eixo */}
      <span
        className="absolute inset-[18%] rounded-full pointer-events-none"
        style={{
          border: `1px solid rgb(${tintSoft} / 0.3)`,
          transform: "rotate3d(1, -1, 0, 60deg)",
          animation: `jarvis-spin ${ringSpeedSlow} linear infinite reverse`,
        }}
      />

      {/* Núcleo plasma — esfera central reativa */}
      <span
        className="absolute rounded-full pointer-events-none transition-transform duration-200"
        style={{
          width: "42%",
          height: "42%",
          transform: `scale(${coreScale})`,
          background: `radial-gradient(circle at 35% 30%, rgb(${tintSoft} / 0.95) 0%, rgb(${tint} / 0.7) 35%, rgb(${tint} / 0.25) 65%, transparent 80%)`,
          boxShadow: `0 0 ${30 + reactive * 50}px rgb(${tint} / ${glow}), inset 0 0 ${20 + reactive * 30}px rgb(${tintSoft} / 0.6)`,
          animation: `jarvis-pulse ${isSpeaking ? "1.2s" : isListening ? "2s" : "3.5s"} ease-in-out infinite`,
        }}
      />

      {/* Núcleo brilhante interno */}
      <span
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "16%",
          height: "16%",
          background: `radial-gradient(circle, white 0%, rgb(${tintSoft}) 50%, transparent 100%)`,
          filter: `blur(${2 + reactive * 4}px)`,
          opacity: 0.85 + reactive * 0.15,
        }}
      />

      {/* Partículas orbitais */}
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="absolute inset-0 pointer-events-none"
          style={{ animation: `jarvis-spin ${6 + i * 2}s linear infinite ${i % 2 ? "reverse" : ""}` }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              top: `${10 + i * 4}%`,
              left: "50%",
              background: `rgb(${tintSoft})`,
              boxShadow: `0 0 8px rgb(${tint}), 0 0 16px rgb(${tint} / 0.6)`,
              transform: "translateX(-50%)",
            }}
          />
        </span>
      ))}

      {/* Feedback rings */}
      {isListening && (
        <span
          className="absolute inset-[4%] rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: `rgb(${tint} / 0.4)` }}
        />
      )}
      {isSpeaking && (
        <span
          className="absolute inset-0 rounded-full border-2 animate-ping pointer-events-none"
          style={{ borderColor: `rgb(${tint} / 0.5)` }}
        />
      )}

      <style>{`
        @keyframes jarvis-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jarvis-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.25); }
        }
      `}</style>
    </button>
  );
}
