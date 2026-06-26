import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Floating plasma light form: translúcido, sem bordas duras, brilho apenas
// nos polos (topo/base), bandas verticais oscilando, respiração lenta.
// Sem HUD, sem anéis, sem partículas — apenas luz volumétrica cyan/branca.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isError = state === "error";
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isConnecting = state === "connecting";
  const isActive = isListening || isSpeaking;
  const reactive = isActive ? Math.min(Math.max(intensity, 0), 1) : 0;

  // Paleta blue-white plasma (Aikortex)
  const white = isError ? "255 210 210" : "230 245 255";
  const tint = isError ? "239 68 68" : "140 195 255";
  const deep = isError ? "120 30 30" : "60 120 210";

  // Respiração lenta — movimento quase imperceptível
  const breath = isSpeaking ? "3.2s" : isListening ? "4.8s" : isConnecting ? "4s" : "7s";
  const bands = isSpeaking ? "8s" : isListening ? "12s" : "18s";
  const glow = isSpeaking ? "5s" : isListening ? "6.5s" : "9s";

  const reactiveScale = 1 + reactive * 0.04;
  const speakGlow = isSpeaking ? 0.32 + reactive * 0.18 : 0.14 + reactive * 0.22;



  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center bg-transparent border-0 p-0 rounded-full",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-transform duration-700",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer glow — expande e contrai suavemente */}
      <span
        className="absolute inset-[-45%] rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgb(${tint} / ${0.14 + reactive * 0.22}) 0%, rgb(${deep} / 0.05) 45%, transparent 72%)`,
          animation: `plasma-glow ${glow} ease-in-out infinite`,
        }}
      />

      {/* Volumetric fog médio */}
      <span
        className="absolute inset-[-15%] rounded-full blur-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgb(${tint} / 0.22) 0%, rgb(${deep} / 0.1) 50%, transparent 78%)`,
          animation: `plasma-glow ${glow} ease-in-out infinite reverse`,
        }}
      />

      {/* Corpo plasma — silhueta circular imperfeita, interior quase transparente.
          Brilho concentrado APENAS nos polos (topo e base). */}
      <span
        className="absolute rounded-full pointer-events-none overflow-hidden"
        style={{
          width: "82%",
          height: "82%",
          transform: `scale(${reactiveScale})`,
          transition: "transform 220ms ease-out",
          // duas elipses brilhantes nos polos + suave membrana cyan
          background: `
            radial-gradient(ellipse 55% 28% at 50% 8%, rgb(${white} / 0.85), rgb(${tint} / 0.35) 55%, transparent 80%),
            radial-gradient(ellipse 55% 28% at 50% 92%, rgb(${white} / 0.78), rgb(${tint} / 0.3) 55%, transparent 80%),
            radial-gradient(circle at 50% 50%, rgb(${tint} / 0.08) 0%, rgb(${tint} / 0.14) 55%, rgb(${deep} / 0.06) 78%, transparent 92%)
          `,
          filter: `blur(${2 + reactive * 1.2}px)`,
          animation: `plasma-breath ${breath} ease-in-out infinite`,
        }}
      >
        {/* Bandas verticais luminosas — oscilam atravessando o centro */}
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(90deg, transparent 47%, rgb(${white} / 0.45) 49.5%, rgb(${white} / 0.7) 50%, rgb(${white} / 0.45) 50.5%, transparent 53%),
              linear-gradient(90deg, transparent 40%, rgb(${tint} / 0.22) 42.5%, transparent 45%),
              linear-gradient(90deg, transparent 55%, rgb(${tint} / 0.22) 57.5%, transparent 60%),
              linear-gradient(90deg, transparent 33%, rgb(${tint} / 0.14) 35%, transparent 37%),
              linear-gradient(90deg, transparent 63%, rgb(${tint} / 0.14) 65%, transparent 67%)
            `,
            mixBlendMode: "screen",
            filter: `blur(${2.5 + reactive * 1.5}px)`,
            animation: `plasma-bands ${bands} ease-in-out infinite`,
            opacity: 0.75,
          }}
        />

        {/* Sutil scattering interno — quase imperceptível */}
        <span
          className="absolute inset-[-8%] pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 45% 30% at 35% 30%, rgb(${white} / 0.18), transparent 75%),
              radial-gradient(ellipse 40% 35% at 65% 70%, rgb(${tint} / 0.18), transparent 75%)
            `,
            mixBlendMode: "screen",
            filter: "blur(18px)",
            animation: `plasma-drift ${bands} ease-in-out infinite alternate`,
          }}
        />
      </span>

      {/* Bloom polar superior — heavy bloom */}
      <span
        className="absolute pointer-events-none rounded-full"
        style={{
          top: "8%",
          left: "30%",
          width: "40%",
          height: "18%",
          background: `radial-gradient(ellipse at center, rgb(${white} / 0.55), transparent 75%)`,
          filter: "blur(14px)",
          animation: `plasma-breath ${breath} ease-in-out infinite`,
        }}
      />
      {/* Bloom polar inferior */}
      <span
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: "8%",
          left: "30%",
          width: "40%",
          height: "18%",
          background: `radial-gradient(ellipse at center, rgb(${white} / 0.5), transparent 75%)`,
          filter: "blur(14px)",
          animation: `plasma-breath ${breath} ease-in-out infinite reverse`,
        }}
      />

      <style>{`
        @keyframes plasma-breath {
          0%, 100% { filter: brightness(0.94) blur(2px); transform: scale(1); }
          50%      { filter: brightness(1.08) blur(2.4px); transform: scale(1.015); }
        }
        @keyframes plasma-glow {
          0%, 100% { opacity: 0.85; transform: scale(0.985); }
          50%      { opacity: 1;    transform: scale(1.02); }
        }
        @keyframes plasma-bands {
          0%, 100% { transform: translateX(-1.5%) scaleY(1);    opacity: 0.65; }
          50%      { transform: translateX( 1.5%) scaleY(1.03); opacity: 0.85; }
        }
        @keyframes plasma-drift {
          0%   { transform: translate(-2%, -1.5%); }
          100% { transform: translate( 2%,  1.5%); }
        }
      `}</style>
    </button>
  );
}
