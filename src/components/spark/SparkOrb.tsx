import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1 reactive scale
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

// Orb estilo photon/Jarvis: nucleo escuro com emissao luminosa, halo de
// fotons, sheen rotativo e particulas orbitando. Reage a intensity (volume)
// pulsando o brilho do core e a escala do halo.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isActive = state === "listening" || state === "speaking";
  const isError = state === "error";
  const reactive = isActive ? Math.min(intensity, 1) : 0;
  const scale = 1 + reactive * 0.08;
  const coreBoost = 0.55 + reactive * 0.45;

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
      {/* 1. Halo externo difuso — emissao de fotons */}
      <span
        className={cn(
          "absolute inset-[-20%] rounded-full blur-3xl transition-opacity duration-500",
          isError ? "bg-[radial-gradient(circle,hsl(var(--destructive)/0.45)_0%,transparent_60%)]"
                  : "bg-[radial-gradient(circle,hsl(var(--primary)/0.45)_0%,transparent_60%)]",
          isActive ? "opacity-100" : "opacity-60",
        )}
        style={{ transform: `scale(${0.9 + reactive * 0.25})` }}
      />

      {/* 2. Halo medio — mais concentrado */}
      <span
        className={cn(
          "absolute inset-[-5%] rounded-full blur-2xl transition-opacity duration-300",
          isError ? "bg-[radial-gradient(circle,hsl(var(--destructive)/0.55)_0%,transparent_55%)]"
                  : "bg-[radial-gradient(circle,hsl(var(--primary)/0.55)_0%,transparent_55%)]",
          isActive ? "opacity-100" : "opacity-70",
        )}
      />

      {/* 3. Aneis pulsantes — listening/speaking */}
      {state === "listening" && (
        <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
      )}
      {state === "speaking" && (
        <>
          <span className="absolute inset-2 rounded-full border border-primary/50 animate-ping [animation-delay:0ms]" />
          <span className="absolute inset-5 rounded-full border border-primary/40 animate-ping [animation-delay:280ms]" />
        </>
      )}

      {/* 4. Sheen rotativo — conic gradient girando lentamente */}
      <span
        className={cn(
          "absolute inset-[8%] rounded-full opacity-70 mix-blend-screen",
          "animate-[spark-spin_8s_linear_infinite]",
        )}
        style={{
          background: isError
            ? "conic-gradient(from 0deg, transparent 0%, hsl(var(--destructive)/0.6) 25%, transparent 50%, hsl(var(--destructive)/0.4) 75%, transparent 100%)"
            : "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)/0.6) 25%, transparent 50%, hsl(var(--primary)/0.4) 75%, transparent 100%)",
          filter: "blur(8px)",
        }}
      />

      {/* 5. Esfera principal — fundo escuro/void */}
      <span
        className={cn(
          "relative rounded-full overflow-hidden",
          "shadow-[0_0_60px_-10px_hsl(var(--primary)/0.5),inset_0_2px_20px_hsl(var(--primary)/0.2)]",
          "border border-primary/30",
          state === "connecting" && "animate-pulse",
          isError && "border-destructive/40 shadow-[0_0_60px_-10px_hsl(var(--destructive)/0.5)]",
        )}
        style={{
          width: size * 0.66,
          height: size * 0.66,
          background:
            "radial-gradient(circle at 50% 55%, hsl(220 40% 8%) 0%, hsl(225 50% 5%) 60%, hsl(230 60% 3%) 100%)",
        }}
      >
        {/* 5a. Core photon — luz central intensa */}
        <span
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-all duration-300",
          )}
          style={{
            width: size * 0.32,
            height: size * 0.32,
            background: isError
              ? `radial-gradient(circle, hsl(var(--destructive) / ${coreBoost}) 0%, hsl(var(--destructive) / ${coreBoost * 0.4}) 50%, transparent 80%)`
              : `radial-gradient(circle, hsl(var(--primary) / ${coreBoost}) 0%, hsl(var(--primary) / ${coreBoost * 0.4}) 50%, transparent 80%)`,
          }}
        />

        {/* 5b. Hot spot — ponto branco brilhante no centro */}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
          style={{
            width: size * 0.12,
            height: size * 0.12,
            background: `radial-gradient(circle, rgba(255,255,255,${0.6 + reactive * 0.4}) 0%, rgba(255,255,255,${0.2 + reactive * 0.2}) 40%, transparent 70%)`,
          }}
        />

        {/* 5c. Sheen interno — gira em sentido contrario pra dar profundidade */}
        <span
          className="absolute inset-0 rounded-full opacity-50 mix-blend-screen animate-[spark-spin-reverse_12s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 90deg, transparent 0%, hsl(var(--primary)/0.4) 30%, transparent 60%, hsl(var(--primary)/0.3) 90%, transparent 100%)",
            filter: "blur(6px)",
          }}
        />

        {/* 5d. Highlight superior — efeito esferico vidro */}
        <span
          className="absolute left-[18%] top-[12%] rounded-full bg-white/40 blur-md"
          style={{ width: size * 0.18, height: size * 0.1 }}
        />

        {/* 5e. Rim light — borda inferior reflexo */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 110%, hsl(var(--primary)/0.3) 0%, transparent 50%)",
          }}
        />
      </span>

      {/* 6. Particulas orbitando — pontos minusculos girando ao redor */}
      {isActive && (
        <>
          <span
            className="absolute inset-0 animate-[spark-spin_6s_linear_infinite] pointer-events-none"
            aria-hidden
          >
            <span
              className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
            />
            <span
              className="absolute left-full top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/70 shadow-[0_0_6px_hsl(var(--primary))]"
            />
          </span>
          <span
            className="absolute inset-0 animate-[spark-spin-reverse_9s_linear_infinite] pointer-events-none"
            aria-hidden
          >
            <span
              className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
            />
            <span
              className="absolute right-full top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/60 shadow-[0_0_6px_hsl(var(--primary))]"
            />
          </span>
        </>
      )}
    </button>
  );
}
