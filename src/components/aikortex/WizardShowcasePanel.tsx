import { useEffect, useRef, useState } from "react";
import { Check, Sun, Moon, Sparkles, MessageSquare, Wrench, Mic, Volume2, BookOpen } from "lucide-react";
import { computeWizardProgress } from "@/lib/wizard-progress";
import { useTheme } from "@/hooks/use-theme";
import aikortexIcon from "@/assets/aikortex-icon-white.png";
import aikortexIconDark from "@/assets/aikortex-icon-black.png";

interface WizardShowcasePanelProps {
  savedConfig?: Record<string, any> | null;
  agentName?: string;
  agentType?: string;
}

/**
 * Painel direito durante o discover do Modo Vibe.
 * Mostra o agente "ganhando vida" conforme as tools rodam:
 * progress ring + avatar central + badges live do savedConfig.
 * Substitui o vazio em volta do chat e dá feedback visual de tudo
 * que está sendo configurado por baixo dos panos.
 */
export default function WizardShowcasePanel({
  savedConfig,
  agentName,
  agentType,
}: WizardShowcasePanelProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const { checkpoints, doneCount, totalCount, pct, currentPhase, totalPhases } = computeWizardProgress(savedConfig);
  const ctx = (savedConfig as any)?.businessContext || {};
  const displayName = agentName && agentName !== "Novo Agente" && agentName !== "Carregando..." ? agentName : null;
  // Channels: aceita array (legacy/UI manual) OU objeto {whatsapp:true} (vibe-mutate)
  const channelsAny = (savedConfig as any)?.channels;
  const channels: string[] = Array.isArray(channelsAny)
    ? channelsAny
    : (channelsAny && typeof channelsAny === "object"
        ? Object.entries(channelsAny).filter(([, v]) => v === true).map(([k]) => k)
        : []);
  // Tom: vibe-mutate grava em businessContext.toneOfVoice; legacy em cfg.toneOfVoice
  const tone = (ctx.toneOfVoice || (savedConfig as any)?.toneOfVoice) as string | undefined;

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (pct / 100) * circumference;

  // Pulse na mudança de fase — chama atenção pra transição sem ser intrusivo
  const phaseId = currentPhase?.id ?? "done";
  const lastPhaseRef = useRef(phaseId);
  const [phasePulse, setPhasePulse] = useState(false);
  useEffect(() => {
    if (lastPhaseRef.current !== phaseId) {
      lastPhaseRef.current = phaseId;
      setPhasePulse(true);
      const t = setTimeout(() => setPhasePulse(false), 1500);
      return () => clearTimeout(t);
    }
  }, [phaseId]);

  // Estado "tudo pronto" — quando todas as fases marcaram done, mostramos o
  // card de resumo (substitui o display de processo). Mais vendedor.
  const isComplete = !currentPhase && doneCount > 0;

  // Dados pro resumo
  const integrations = (savedConfig as any)?.integrations ?? [];
  const tools = Array.isArray(integrations)
    ? integrations
    : (integrations && typeof integrations === "object" ? Object.keys(integrations).filter((k) => integrations[k]) : []);
  const knowledgeFiles = (savedConfig as any)?.knowledgeFiles ?? [];
  const urls = (savedConfig as any)?.urls ?? [];
  const kbCount = (Array.isArray(knowledgeFiles) ? knowledgeFiles.length : 0) + (Array.isArray(urls) ? urls.length : 0);
  const greetingMessage = (savedConfig as any)?.greetingMessage as string | undefined;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-card/20 to-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Theme toggle (substitui label MODO VIBE) */}
      <button
        type="button"
        onClick={toggle}
        title={isDark ? "Modo claro" : "Modo escuro"}
        className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-card/60 hover:bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Modo "agente pronto" — card de resumo (G4). Substitui o display de processo
          quando o checklist completa. Mais vendedor que o display anterior. */}
      {isComplete ? (
        <div className="relative z-10 flex flex-col items-center max-w-md px-6 w-full">
          <div className="mb-4 px-3 py-1.5 rounded-full border text-[11px] font-medium tracking-wide bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              Tudo pronto pra criar
            </span>
          </div>

          <div className="w-full rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm p-6 shadow-xl shadow-primary/5 space-y-5">
            {/* Header — avatar + nome + cargo */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                <img
                  src={isDark ? aikortexIcon : aikortexIconDark}
                  alt="Aikortex"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {displayName || "Seu agente"}
                </h2>
                {agentType && agentType !== "Custom" && (
                  <p className="text-xs text-muted-foreground mt-0.5">Agente {agentType}</p>
                )}
                {ctx.companyName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ctx.companyName}</p>
                )}
              </div>
            </div>

            {/* Resumo em linhas */}
            <div className="space-y-2.5">
              {tone && (
                <div className="flex items-start gap-2 text-xs">
                  <Volume2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Tom: </span>
                    <span className="text-foreground font-medium">{tone}</span>
                  </div>
                </div>
              )}
              {channels.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Canais: </span>
                    <span className="text-foreground font-medium">{channels.join(", ")}</span>
                  </div>
                </div>
              )}
              {tools.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <Wrench className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Ferramentas: </span>
                    <span className="text-foreground font-medium">{tools.length} {tools.length === 1 ? "integração" : "integrações"}</span>
                  </div>
                </div>
              )}
              {kbCount > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Conhecimento: </span>
                    <span className="text-foreground font-medium">{kbCount} {kbCount === 1 ? "fonte" : "fontes"}</span>
                  </div>
                </div>
              )}
              {greetingMessage && (
                <div className="text-xs italic text-muted-foreground border-t border-border/40 pt-3 mt-3 line-clamp-2">
                  "{greetingMessage}"
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-5 text-center max-w-xs">
            Digite "criar" no chat pra finalizar, ou peça ajustes que ainda quiser fazer.
          </p>
        </div>
      ) : (
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 w-full">
        {/* Fase atual (§13.2) — pulse na transição */}
        <div className={`mb-5 px-3 py-1.5 rounded-full border text-[11px] font-medium tracking-wide transition-all duration-500 ${
          currentPhase
            ? `bg-primary/10 border-primary/30 text-primary ${phasePulse ? "ring-2 ring-primary/40 scale-105" : ""}`
            : "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
        }`}>
          {currentPhase ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Fase {currentPhase.index} de {totalPhases} · {currentPhase.label}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              Agente pronto
            </span>
          )}
        </div>

        {/* Progress ring + animated avatar */}
        <div className="relative w-36 h-36 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.4" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#wizardGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="wizardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
          {/* Aikortex icon in center (adapta ao tema) */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
            <img
              src={isDark ? aikortexIcon : aikortexIconDark}
              alt="Aikortex"
              className="w-14 h-14 object-contain animate-pulse"
              style={{ animationDuration: "3s" }}
            />
          </div>
          {/* % indicator */}
          {pct > 0 && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-md">
              {pct}%
            </div>
          )}
        </div>

        {/* Live agent identity */}
        <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-1 text-center min-h-[2rem]">
          {displayName || <span className="text-muted-foreground/40 italic font-normal">Seu agente</span>}
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          {agentType && agentType !== "Custom" ? `Agente ${agentType}` : "Em construção"}
        </p>

        {/* Live badges from tools */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-7 min-h-[28px]">
          {ctx.niche && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <Check className="w-2.5 h-2.5" /> {ctx.niche}
            </span>
          )}
          {ctx.companyName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400">
              <Check className="w-2.5 h-2.5" /> {ctx.companyName}
            </span>
          )}
          {tone && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400">
              <Check className="w-2.5 h-2.5" /> {tone}
            </span>
          )}
          {channels.slice(0, 3).map((ch) => (
            <span key={ch} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
              <Check className="w-2.5 h-2.5" /> {ch}
            </span>
          ))}
          {!ctx.niche && !ctx.companyName && !tone && channels.length === 0 && (
            <span className="text-[10px] text-muted-foreground/50 italic">
              Os detalhes aparecem aqui conforme você responde
            </span>
          )}
        </div>

        {/* Checklist */}
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Checklist</span>
            <span>{doneCount}/{totalCount}</span>
          </div>
          <div className="space-y-1">
            {checkpoints.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-all ${
                  c.done
                    ? "bg-primary/8 border-primary/25 text-foreground"
                    : "bg-card/30 border-border/40 text-muted-foreground"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  c.done ? "bg-primary text-primary-foreground" : "border border-muted-foreground/40"
                }`}>
                  {c.done && <Check className="w-2.5 h-2.5" />}
                </span>
                <span className="font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
