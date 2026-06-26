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

// Esfera de pontos interconectados (constelação esférica) — mantém paleta
// blue-white plasma do Aikortex. Pontos respiram lentamente; quando o Spark
// fala, a rede pulsa e gira mais rápido, e as conexões ficam mais brilhantes.
export function SparkOrb({ state, intensity = 0, onClick, size = 260, disabled }: SparkOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<OrbState>(state);
  const intensityRef = useRef<number>(intensity);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Gera pontos distribuídos uniformemente numa esfera (Fibonacci sphere).
    const POINT_COUNT = 180;
    const points: { x: number; y: number; z: number }[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < POINT_COUNT; i++) {
      const y = 1 - (i / (POINT_COUNT - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius });
    }

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.4;

    let raf = 0;
    let t = 0;

    const draw = () => {
      const s = stateRef.current;
      const inten = intensityRef.current;
      const isError = s === "error";
      const isSpeaking = s === "speaking";
      const isListening = s === "listening";
      const isActive = isSpeaking || isListening;

      // Paleta Aikortex (mantida)
      const whiteRGB = isError ? "255, 210, 210" : "230, 245, 255";
      const tintRGB = isError ? "239, 68, 68" : "140, 195, 255";

      // Velocidades
      const baseSpeed = isSpeaking ? 0.012 : isListening ? 0.006 : 0.003;
      t += baseSpeed + inten * 0.015;

      // Pulse (radial breathing) reativo
      const pulseBase = isSpeaking ? 0.06 : isListening ? 0.035 : 0.02;
      const pulse = 1 + Math.sin(t * 1.6) * pulseBase + (isActive ? inten * 0.08 : 0);

      ctx.clearRect(0, 0, size, size);

      // Halo suave de fundo
      const haloAlpha = isSpeaking ? 0.28 + inten * 0.2 : isListening ? 0.18 : 0.12;
      const halo = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.6);
      halo.addColorStop(0, `rgba(${tintRGB}, ${haloAlpha})`);
      halo.addColorStop(1, `rgba(${tintRGB}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);

      // Rotaciona pontos em Y e X
      const cosY = Math.cos(t);
      const sinY = Math.sin(t);
      const cosX = Math.cos(t * 0.35);
      const sinX = Math.sin(t * 0.35);

      const projected: { x: number; y: number; z: number; size: number; alpha: number }[] = [];
      for (const p of points) {
        // Rotação Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        // Rotação X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const x2 = x1;

        // Projeção perspectiva
        const persp = 1 / (1.8 - z2 * 0.5);
        const sx = cx + x2 * R * pulse * persp;
        const sy = cy + y2 * R * pulse * persp;
        // Profundidade normalizada 0..1 (1 = mais perto)
        const depth = (z2 + 1) / 2;
        const dotSize = (0.7 + depth * 1.8) * (isSpeaking ? 1.15 : 1);
        const alpha = 0.25 + depth * 0.75;
        projected.push({ x: sx, y: sy, z: z2, size: dotSize, alpha });
      }

      // Conexões entre pontos próximos
      const maxDist = R * 0.32;
      const lineAlphaBoost = isSpeaking ? 0.7 + inten * 0.4 : isListening ? 0.45 : 0.28;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        if (a.z < -0.4) continue; // pula pontos muito atrás
        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          if (b.z < -0.4) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            const k = 1 - d / maxDist;
            const alpha = k * k * lineAlphaBoost * Math.min(a.alpha, b.alpha);
            ctx.strokeStyle = `rgba(${tintRGB}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Pontos por cima das linhas
      for (const p of projected) {
        const color = p.z > 0.3 ? whiteRGB : tintRGB;
        ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // Glow sutil nos pontos da frente quando falando
        if (isSpeaking && p.z > 0.4) {
          ctx.fillStyle = `rgba(${whiteRGB}, ${0.18 * p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Spark voice toggle"
      className={cn(
        "relative grid place-items-center bg-transparent border-0 p-0 rounded-full",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        "transition-transform duration-300",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: "block" }}
      />
    </button>
  );
}
