import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const THINKING_STEPS = [
  "Modo Vibe iniciado",
  "Analisando sua resposta",
  "Identificando contexto do agente",
  "Aplicando configurações no draft",
  "Preparando próxima pergunta",
] as const;

/**
 * Card de "thinking" visível enquanto o wizard processa a resposta do user.
 * Master v7.4 §13.2 — torna o "Modo Vibe acting" tangível: o user VÊ
 * o que a IA está fazendo enquanto pensa, não só um spinner genérico.
 */
export default function WizardThinkingCard() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    setVisibleCount(1);
    // Revela os steps sequencialmente. Se a resposta chegar antes do
    // último step ser revelado, o card simplesmente desmonta.
    const timers = THINKING_STEPS.map((_, i) =>
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * 650)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <div className="flex gap-3">
      {/* Gradient ball pulsante */}
      <div className="relative w-7 h-7 shrink-0 mt-0.5">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/30 via-purple-500/30 to-fuchsia-500/30 blur-md" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground mb-2">Respondendo...</p>
        <ul className="space-y-1.5 ml-0.5 border-l border-border/40 pl-3">
          {THINKING_STEPS.map((step, i) => {
            const isVisible = i < visibleCount;
            const isCurrent = i === visibleCount - 1;
            if (!isVisible) return null;
            return (
              <li
                key={step}
                className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                  isCurrent ? "text-foreground" : "text-muted-foreground/70"
                }`}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  {isCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  ) : (
                    <Check className="w-3 h-3 text-emerald-500" />
                  )}
                </span>
                <span>
                  {step}
                  {isCurrent ? "..." : "."}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
