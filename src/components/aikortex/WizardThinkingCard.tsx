import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import aikortexIconWhite from "@/assets/aikortex-icon-white.png";
import aikortexIconBlack from "@/assets/aikortex-icon-black.png";

// Master v7.4 §13.2 — processo ONE-SHOT dividido em 3 fases mentais,
// com labels que soam como pensamento ("Pensando sobre…", "Planejando…",
// "Desenvolvendo…") em vez de imperativos secos ("Aplicar X").
const PHASES = [
  {
    id: "thinking",
    label: "Pensando",
    steps: [
      "Pensando sobre o que você descreveu",
      "Identificando o tipo de agente ideal",
    ],
  },
  {
    id: "planning",
    label: "Planejando",
    steps: [
      "Planejando o perfil do agente",
      "Pensando nos canais e integrações necessárias",
      "Pensando nos critérios certos",
      "Pensando no fluxo de conversa",
    ],
  },
  {
    id: "building",
    label: "Desenvolvendo",
    steps: [
      "Desenvolvendo o agente",
      "Finalizando os últimos ajustes",
    ],
  },
] as const;

const TOTAL_STEPS = PHASES.reduce((acc, p) => acc + p.steps.length, 0);
const STEP_INTERVAL_MS = 1300;

export default function WizardThinkingCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [globalStep, setGlobalStep] = useState(1);

  useEffect(() => {
    setGlobalStep(1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < TOTAL_STEPS; i++) {
      timers.push(setTimeout(() => setGlobalStep(i + 1), i * STEP_INTERVAL_MS));
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <div className="flex gap-3">
      {/* Ícone Aikortex pulsante (cor adapta ao tema) */}
      <div className="relative w-9 h-9 shrink-0 mt-0.5">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/30 animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-md animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={isDark ? aikortexIconWhite : aikortexIconBlack}
            alt="Aikortex"
            className="w-5 h-5 object-contain"
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground mb-3">Construindo seu agente...</p>

        {/* Lista de phases + sub-steps inline */}
        {(() => {
          let cursor = 0;
          return PHASES.map((phase) => {
            const phaseStart = cursor + 1;
            const phaseEnd = cursor + phase.steps.length;
            cursor += phase.steps.length;
            if (globalStep < phaseStart) return null;

            const phaseDone = globalStep > phaseEnd;

            return (
              <div key={phase.id} className="mb-3 last:mb-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                  phaseDone ? "text-emerald-600 dark:text-emerald-500" : "text-primary"
                }`}>
                  {phase.label}
                  {phaseDone && <Check className="inline-block w-3 h-3 ml-1" />}
                </p>
                <ul className="space-y-1 ml-0.5 border-l border-border/40 pl-3">
                  {phase.steps.map((step, stepIdx) => {
                    const stepGlobal = phaseStart + stepIdx;
                    if (globalStep < stepGlobal) return null;
                    const isCurrent = globalStep === stepGlobal;
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
            );
          });
        })()}
      </div>
    </div>
  );
}
