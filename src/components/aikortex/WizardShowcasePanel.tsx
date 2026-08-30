import { useEffect, useRef, useState } from "react";
import {
  Check, Sun, Moon, Sparkles, MessageSquare, Wrench, Volume2, BookOpen,
  Target, ScrollText, IdCard, ChevronRight,
} from "lucide-react";
import { computeWizardSections, computeWizardProgress, type WizardSectionId } from "@/lib/wizard-progress";
import { agentTypeLabel } from "@/lib/agent-type-labels";
import { useTheme } from "@/hooks/use-theme";
import aikortexIcon from "@/assets/aikortex-icon-white.png";
import aikortexIconDark from "@/assets/aikortex-icon-black.png";

interface WizardShowcasePanelProps {
  savedConfig?: Record<string, any> | null;
  agentName?: string;
  agentType?: string;
  /** Clicar numa seção abre o editor daquela seção (config real). */
  onSectionClick?: (id: WizardSectionId) => void;
}

const SECTION_ICONS: Record<WizardSectionId, typeof Sparkles> = {
  identity: IdCard,
  expertise: Target,
  personality: Volume2,
  instructions: ScrollText,
  tools: Wrench,
  channels: MessageSquare,
  knowledge: BookOpen,
};

/**
 * Painel direito do Modo Vibe — "montagem ao vivo" (estilo Clint).
 * A cada resposta do usuário, as seções do agente acendem de vazio → pronto,
 * dando o feedback visual de que o agente está nascendo peça por peça.
 */
export default function WizardShowcasePanel({
  savedConfig,
  agentName,
  agentType,
  onSectionClick,
}: WizardShowcasePanelProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const { sections, readyCount } = computeWizardSections(savedConfig);
  const { pct } = computeWizardProgress(savedConfig);
  const total = sections.length;
  const started = readyCount > 0;
  const complete = readyCount >= sections.filter((s) => !s.optional).length && readyCount > 0;

  const displayName =
    agentName && agentName !== "Novo Agente" && agentName !== "Carregando..." ? agentName : null;

  const header = complete
    ? { title: "Agente pronto! 🎉", subtitle: "Revise as seções ao lado ou já teste seu agente." }
    : started
    ? { title: "Montando seu agente…", subtitle: "A cada resposta, as seções abaixo vão sendo preenchidas." }
    : { title: "Vamos montar seu agente", subtitle: "Responda à IA ao lado. Cada resposta acende uma seção aqui." };

  // Pulse quando o número de seções prontas muda — chama atenção pro avanço.
  const lastReadyRef = useRef(readyCount);
  const [pulseId, setPulseId] = useState<WizardSectionId | null>(null);
  useEffect(() => {
    if (readyCount > lastReadyRef.current) {
      const justReady = sections.find((s) => s.status === "ready");
      // acha a última seção que virou ready (heurística: a de maior índice pronta)
      const lastReady = [...sections].reverse().find((s) => s.status === "ready");
      setPulseId((lastReady || justReady)?.id ?? null);
      const t = setTimeout(() => setPulseId(null), 1400);
      lastReadyRef.current = readyCount;
      return () => clearTimeout(t);
    }
    lastReadyRef.current = readyCount;
  }, [readyCount, sections]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-card/20 to-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[320px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggle}
        title={isDark ? "Modo claro" : "Modo escuro"}
        className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-card/60 hover:bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto px-6 pt-10 pb-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30 flex items-center justify-center shrink-0 ${started && !complete ? "animate-pulse" : ""}`} style={{ animationDuration: "2.5s" }}>
            <img src={isDark ? aikortexIcon : aikortexIconDark} alt="Aikortex" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-foreground leading-tight">{header.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{header.subtitle}</p>
          </div>
        </div>

        {/* Identidade viva + progresso */}
        <div className="mt-4 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-foreground truncate">
              {displayName || <span className="text-muted-foreground/50 italic">Seu agente</span>}
              {agentType && agentType !== "Custom" && (
                <span className="text-muted-foreground font-normal"> · {agentTypeLabel(agentType)}</span>
              )}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground shrink-0">{readyCount}/{total} seções</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(pct, (readyCount / total) * 100)}%` }}
            />
          </div>
        </div>

        {/* Seções vazio → pronto */}
        <div className="space-y-2">
          {sections.map((s) => {
            const Icon = SECTION_ICONS[s.id];
            const ready = s.status === "ready";
            const pulsing = pulseId === s.id;
            const clickable = !!onSectionClick;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSectionClick?.(s.id)}
                disabled={!clickable}
                title={clickable ? `Editar ${s.label}` : undefined}
                className={`group w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                  ready
                    ? "bg-emerald-500/[0.07] border-emerald-500/25"
                    : "bg-card/30 border-border/50"
                } ${pulsing ? "ring-2 ring-emerald-500/40 scale-[1.02]" : ""} ${
                  clickable ? "hover:border-primary/50 hover:bg-primary/[0.04] cursor-pointer" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  ready ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted/60 text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${ready ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 truncate leading-tight">
                    {ready && s.detail ? s.detail : s.subtitle}
                  </p>
                </div>
                {ready ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Check className="w-2.5 h-2.5" /> pronto
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 text-muted-foreground/70 shrink-0">
                    {s.optional ? "opcional" : "vazio"}
                  </span>
                )}
                {clickable && (
                  <span className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground/70 mt-4 leading-snug">
          {complete ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <Sparkles className="w-3 h-3" /> Digite "criar" no chat pra finalizar.
            </span>
          ) : (
            "Nem toda seção precisa ser preenchida — a IA usa só o que fizer sentido pra este agente."
          )}
        </p>
      </div>
    </div>
  );
}
