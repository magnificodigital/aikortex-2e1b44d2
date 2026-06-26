import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Holographic plasma orb: translúcido, névoa volumétrica, streaks verticais,
// bordas borradas e respiração lenta — paleta cyan Aikortex.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isError = state === "error";
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isConnecting = state === "connecting";
  const isActive = isListening || isSpeaking;
  const reactive = isActive ? Math.min(Math.max(intensity, 0), 1) : 0;

  // Cyan plasma tints (Aikortex)
  const core = isError ? "248 113 113" : "180 230 255";
  const tint = isError ? "239 68 68" : "90 170 255";
  const deep = isError ? "180 40 40" : "40 110 220";

  const breath = isSpeaking ? "2.4s" : isListening ? "3.6s" : isConnecting ? "3s" : "6s";
  const drift = isSpeaking ? "9s" : isListening ? "14s" : "22s";
  const scale = 1 + reactive * 0.08;

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
      style={{ width: size, height: size }}
    >
      {/* Halo externo difuso — luz cyan vazando na escuridão */}
      <span
        className="absolute inset-[-40%] rounded-full blur-3xl pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle, rgb(${tint} / ${0.18 + reactive * 0.32}) 0%, rgb(${deep} / 0.08) 40%, transparent 70%)`,
          opacity: isActive ? 1 : isConnecting ? 0.8 : 0.6,
          animation: `plasma-breath ${breath} ease-in-out infinite`,
        }}
      />

      {/* Halo médio — fog volumétrico */}
      <span
        className="absolute inset-[-10%] rounded-full blur-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 55%, rgb(${tint} / 0.35) 0%, rgb(${deep} / 0.18) 45%, transparent 75%)`,
          animation: `plasma-breath ${breath} ease-in-out infinite reverse`,
        }}
      />

      {/* Corpo translúcido do orb — esfera de plasma */}
      <span
        className="absolute rounded-full pointer-events-none overflow-hidden"
        style={{
          width: "78%",
          height: "78%",
          transform: `scale(${scale})`,
          transition: "transform 180ms ease-out",
          background: `
            radial-gradient(circle at 50% 38%, rgb(${core} / 0.55) 0%, rgb(${tint} / 0.35) 28%, rgb(${deep} / 0.22) 55%, rgb(${deep} / 0.05) 78%, transparent 92%)
          `,
          boxShadow: `
            0 0 ${40 + reactive * 60}px rgb(${tint} / ${0.45 + reactive * 0.35}),
            inset 0 0 ${50 + reactive * 30}px rgb(${tint} / 0.35),
            inset 0 0 ${20 + reactive * 20}px rgb(${core} / 0.5)
          `,
          filter: `blur(${0.5 + reactive * 0.6}px)`,
          animation: `plasma-breath ${breath} ease-in-out infinite`,
        }}
      >
        {/* Streaks verticais luminosos atravessando o centro */}
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(90deg, transparent 46%, rgb(${core} / 0.55) 49.5%, rgb(255 255 255 / 0.85) 50%, rgb(${core} / 0.55) 50.5%, transparent 54%),
              linear-gradient(90deg, transparent 38%, rgb(${tint} / 0.35) 41%, transparent 44%),
              linear-gradient(90deg, transparent 56%, rgb(${tint} / 0.35) 59%, transparent 62%),
              linear-gradient(90deg, transparent 30%, rgb(${tint} / 0.2) 32%, transparent 34%),
              linear-gradient(90deg, transparent 66%, rgb(${tint} / 0.2) 68%, transparent 70%)
            `,
            mixBlendMode: "screen",
            filter: `blur(${1.2 + reactive * 1.5}px)`,
            animation: `plasma-streak ${drift} ease-in-out infinite`,
            opacity: 0.85,
          }}
        />

        {/* Fog interno em movimento — plasma drift */}
        <span
          className="absolute inset-[-10%] pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 30% 40%, rgb(${core} / 0.35), transparent 70%),
              radial-gradient(ellipse 50% 70% at 70% 60%, rgb(${tint} / 0.35), transparent 70%),
              radial-gradient(ellipse 40% 30% at 50% 80%, rgb(${deep} / 0.4), transparent 70%)
            `,
            mixBlendMode: "screen",
            filter: "blur(14px)",
            animation: `plasma-drift ${drift} ease-in-out infinite alternate`,
          }}
        />

        {/* Highlight especular superior — distorção óptica */}
        <span
          className="absolute pointer-events-none"
          style={{
            top: "12%",
            left: "28%",
            width: "44%",
            height: "26%",
            background: `radial-gradient(ellipse at center, rgb(255 255 255 / 0.55), transparent 70%)`,
            filter: "blur(8px)",
            animation: `plasma-breath ${breath} ease-in-out infinite`,
          }}
        />
      </span>

      {/* Núcleo brilhante central */}
      <span
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "10%",
          height: "10%",
          background: `radial-gradient(circle, white 0%, rgb(${core}) 50%, transparent 100%)`,
          filter: `blur(${2 + reactive * 3}px)`,
          opacity: 0.9,
          animation: `plasma-breath ${breath} ease-in-out infinite`,
        }}
      />

      {/* Feedback rings (sutis) */}
      {isListening && (
        <span
          className="absolute inset-[2%] rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: `rgb(${tint} / 0.25)` }}
        />
      )}
      {isSpeaking && (
        <span
          className="absolute inset-0 rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: `rgb(${tint} / 0.3)` }}
        />
      )}

      <style>{`
        @keyframes plasma-breath {
          0%, 100% { filter: brightness(0.92); transform: scale(1); }
          50% { filter: brightness(1.12); transform: scale(1.025); }
        }
        @keyframes plasma-streak {
          0%, 100% { transform: translateX(-2%) scaleY(1); opacity: 0.75; }
          50% { transform: translateX(2%) scaleY(1.05); opacity: 1; }
        }
        @keyframes plasma-drift {
          0% { transform: translate(-3%, -2%) rotate(0deg); }
          100% { transform: translate(3%, 2%) rotate(8deg); }
        }
      `}</style>
    </button>
  );
}
