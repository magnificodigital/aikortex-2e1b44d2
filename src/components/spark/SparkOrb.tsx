import { cn } from "@/lib/utils";

type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface SparkOrbProps {
  state: OrbState;
  intensity?: number; // 0-1 reactive scale
  onClick?: () => void;
  size?: number;
  disabled?: boolean;
}

export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const isActive = state === "listening" || state === "speaking";
  const scale = 1 + (isActive ? Math.min(intensity, 1) * 0.12 : 0);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center rounded-full transition-transform duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size, transform: `scale(${scale})` }}
    >
      {/* Outer pulsing rings */}
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-primary/5 to-transparent blur-2xl transition-opacity",
          isActive ? "opacity-100 animate-pulse" : "opacity-50",
          state === "error" && "from-destructive/40",
        )}
      />
      {state === "listening" && (
        <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
      )}
      {state === "speaking" && (
        <>
          <span className="absolute inset-2 rounded-full border border-primary/40 animate-ping [animation-delay:0ms]" />
          <span className="absolute inset-4 rounded-full border border-primary/30 animate-ping [animation-delay:200ms]" />
        </>
      )}

      {/* Core orb */}
      <span
        className={cn(
          "relative rounded-full backdrop-blur-xl",
          "bg-gradient-to-br from-primary/40 via-primary/20 to-primary/5",
          "border border-primary/30 shadow-2xl shadow-primary/20",
          "transition-all duration-300",
          state === "connecting" && "animate-pulse",
          state === "error" && "from-destructive/40 border-destructive/40",
        )}
        style={{ width: size * 0.62, height: size * 0.62 }}
      >
        <span
          className="absolute inset-3 rounded-full bg-gradient-to-tr from-white/20 via-primary/10 to-transparent"
        />
        <span
          className="absolute left-1/3 top-1/4 w-1/3 h-1/4 rounded-full bg-white/30 blur-md"
        />
      </span>
    </button>
  );
}
