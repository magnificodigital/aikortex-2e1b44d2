import { useEffect, useState } from "react";
import { Check, Loader2, Brain, ListChecks, Hammer } from "lucide-react";

// Master v7.4 §13.2 — processo ONE-SHOT divido em 3 fases mentais:
// pensar (entender) → planejar (decidir) → construir (aplicar).
// Cada fase tem sub-steps que revelam sequencialmente.
const PHASES = [
  {
    id: "thinking",
    label: "Pensando",
    icon: Brain,
    color: "from-violet-400 via-purple-500 to-fuchsia-500",
    steps: ["Analisando descrição", "Identificando intenção do agente"],
  },
  {
    id: "planning",
    label: "Planejando",
    icon: ListChecks,
    color: "from-sky-400 via-blue-500 to-indigo-500",
    steps: [
      "Mapeando perfil do agente",
      "Selecionando canais e integrações",
      "Estruturando critérios operacionais",
      "Definindo fluxo de conversa",
    ],
  },
  {
    id: "building",
    label: "Construindo",
    icon: Hammer,
    color: "from-amber-400 via-orange-500 to-rose-500",
    steps: ["Aplicando configurações no draft", "Finalizando agente"],
  },
] as const;

const TOTAL_STEPS = PHASES.reduce((acc, p) => acc + p.steps.length, 0);
const STEP_INTERVAL_MS = 1300;

export default function WizardThinkingCard() {
  const [globalStep, setGlobalStep] = useState(1);

  useEffect(() => {
    setGlobalStep(1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < TOTAL_STEPS; i++) {
      timers.push(setTimeout(() => setGlobalStep(i + 1), i * STEP_INTERVAL_MS));
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Calcula quais sub-steps estão visíveis em cada fase
  let cursor = 0;
  return (
    <div className="space-y-4">
      {PHASES.map((phase, phaseIdx) => {
        const phaseStartGlobal = cursor + 1;
        const phaseEndGlobal = cursor + phase.steps.length;
        cursor += phase.steps.length;

        // Esta fase ainda não começou? Não renderiza.
        if (globalStep < phaseStartGlobal) return null;

        const isActive = globalStep <= phaseEndGlobal;
        const isComplete = globalStep > phaseEndGlobal;
        const PhaseIcon = phase.icon;

        return (
          <div key={phase.id} className="flex gap-3">
            {/* Ícone da fase com gradient */}
            <div className="relative w-8 h-8 shrink-0 mt-0.5">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${phase.color} ${
                  isActive ? "animate-pulse" : ""
                }`}
              />
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${phase.color} opacity-30 blur-md ${isActive ? "animate-pulse" : ""}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <PhaseIcon className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold mb-2 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {phase.label}
                {isActive && <span className="text-muted-foreground font-normal">...</span>}
                {isComplete && <Check className="inline-block w-3.5 h-3.5 ml-1.5 text-emerald-500" />}
              </p>
              <ul className="space-y-1.5 ml-0.5 border-l border-border/40 pl-3">
                {phase.steps.map((step, stepIdx) => {
                  const stepGlobal = phaseStartGlobal + stepIdx;
                  if (globalStep < stepGlobal) return null;
                  const isCurrentStep = globalStep === stepGlobal && isActive;
                  return (
                    <li
                      key={step}
                      className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                        isCurrentStep ? "text-foreground" : "text-muted-foreground/70"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                        {isCurrentStep ? (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        ) : (
                          <Check className="w-3 h-3 text-emerald-500" />
                        )}
                      </span>
                      <span>
                        {step}
                        {isCurrentStep ? "..." : "."}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
