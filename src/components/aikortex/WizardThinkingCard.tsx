import { Check, Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import aikortexIconWhite from "@/assets/aikortex-icon-white.png";
import aikortexIconBlack from "@/assets/aikortex-icon-black.png";

interface WizardThinkingCardProps {
  /** Estado vivo do draft via polling — usado pra marcar steps reais. */
  savedConfig?: Record<string, any> | null;
}

// Master v7.4 §13.2 + §13.5 — cada step corresponde a um CAMPO REAL do
// agente sendo configurado por uma tool específica. NÃO é animação fake:
// step só vira ✓ quando o respectivo campo já foi salvo no draft via polling.
interface ThinkingStep {
  id: string;
  label: string;
  done: (cfg: any) => boolean;
}

const STEPS: ThinkingStep[] = [
  // ── PENSANDO — entendimento da descrição ──
  { id: "analyze",   label: "Analisando sua descrição",          done: () => true /* primeiro step sempre marcado */ },
  { id: "niche",     label: "Identificando o nicho do negócio",  done: (cfg) => !!cfg?.businessContext?.niche },
  { id: "company",   label: "Reconhecendo a empresa",            done: (cfg) => !!cfg?.businessContext?.companyName },

  // ── PLANEJANDO — desenho do agente ──
  { id: "name",      label: "Nomeando o agente",                 done: (cfg) => !!cfg?.name && cfg.name !== "Novo Agente" && cfg.name !== "Carregando..." },
  { id: "tone",      label: "Definindo o tom de voz",            done: (cfg) => !!(cfg?.businessContext?.toneOfVoice || cfg?.toneOfVoice) },
  { id: "objective", label: "Estruturando o objetivo principal", done: (cfg) => !!(cfg?.profile?.primaryGoal || cfg?.objective) },
  { id: "channels",  label: "Selecionando canais de comunicação", done: (cfg) => {
      const ch = cfg?.channels;
      if (Array.isArray(ch)) return ch.length > 0;
      if (ch && typeof ch === "object") return Object.values(ch).some((v) => v === true);
      return false;
    },
  },
  { id: "integrations", label: "Mapeando integrações externas",  done: (cfg) => Array.isArray(cfg?.externalIntegrations) && cfg.externalIntegrations.length > 0 },

  // ── DESENVOLVENDO — escrita do agente ──
  { id: "instructions", label: "Escrevendo as instruções operacionais", done: (cfg) => !!cfg?.instructions && cfg.instructions.length > 80 },
  { id: "greeting",     label: "Criando a mensagem de saudação",        done: (cfg) => !!cfg?.greetingMessage },
  { id: "finalize",     label: "Finalizando o agente",                  done: (cfg) => !!cfg?.wizard_completed },
];

const PHASE_BREAKPOINTS = [3, 8]; // step indexes onde fases mudam

function phaseLabel(stepIdx: number): string {
  if (stepIdx < PHASE_BREAKPOINTS[0]) return "Pensando";
  if (stepIdx < PHASE_BREAKPOINTS[1]) return "Planejando";
  return "Desenvolvendo";
}

export default function WizardThinkingCard({ savedConfig }: WizardThinkingCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Calcula status real de cada step a partir do savedConfig vivo
  const statuses = STEPS.map((s) => s.done(savedConfig));
  // Primeiro step ainda não feito = o atual em andamento
  const currentIdx = statuses.findIndex((d) => !d);
  const currentPhase = currentIdx === -1 ? "Desenvolvendo" : phaseLabel(currentIdx);

  return (
    <div className="flex gap-3">
      {/* Ícone Aikortex pulsante (theme-aware) */}
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
        <p className="text-sm font-semibold text-foreground mb-3">
          {currentIdx === -1 ? "Agente quase pronto..." : `${currentPhase}...`}
        </p>

        {/* Lista agrupada por fase. Steps só aparecem após sua fase ser alcançada. */}
        {(() => {
          // Agrupa steps por fase
          const phases: { label: string; steps: { step: ThinkingStep; idx: number; done: boolean }[] }[] = [];
          let buf: { step: ThinkingStep; idx: number; done: boolean }[] = [];
          let lastPhase = "";
          STEPS.forEach((step, idx) => {
            const p = phaseLabel(idx);
            if (p !== lastPhase) {
              if (buf.length) phases.push({ label: lastPhase, steps: buf });
              buf = [];
              lastPhase = p;
            }
            buf.push({ step, idx, done: statuses[idx] });
          });
          if (buf.length) phases.push({ label: lastPhase, steps: buf });

          return phases.map((phase) => {
            // Mostra a fase se algum step dela está sendo trabalhado ou já passou
            const reached = phase.steps.some((s) => s.done) || phase.steps.some((s) => s.idx === currentIdx);
            if (!reached) return null;
            const phaseDone = phase.steps.every((s) => s.done);
            const phaseActive = phase.label === currentPhase && !phaseDone;

            return (
              <div key={phase.label} className="mb-3 last:mb-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                  phaseDone
                    ? "text-emerald-600 dark:text-emerald-500"
                    : phaseActive
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}>
                  {phase.label}
                  {phaseDone && <Check className="inline-block w-3 h-3 ml-1" />}
                </p>
                <ul className="space-y-1 ml-0.5 border-l border-border/40 pl-3">
                  {phase.steps.map(({ step, idx, done }) => {
                    // Step não aparece até ser alcançado (ou já estar feito)
                    const reachedStep = done || idx === currentIdx || idx < currentIdx;
                    if (!reachedStep) return null;
                    const isCurrent = idx === currentIdx;
                    return (
                      <li
                        key={step.id}
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
                          {step.label}
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
