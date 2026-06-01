import { Check } from "lucide-react";
import { computeWizardProgress } from "@/lib/wizard-progress";
import aikortexIcon from "@/assets/aikortex-icon-white.png";

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
  const { checkpoints, doneCount, totalCount, pct } = computeWizardProgress(savedConfig);
  const ctx = (savedConfig as any)?.businessContext || {};
  const displayName = agentName && agentName !== "Novo Agente" && agentName !== "Carregando..." ? agentName : null;
  const channels: string[] = Array.isArray((savedConfig as any)?.channels) ? (savedConfig as any).channels : [];
  const tone = (savedConfig as any)?.toneOfVoice as string | undefined;

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-card/20 to-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* MODO VIBE label */}
      <div className="absolute top-4 right-4 opacity-40">
        <span className="text-[10px] font-medium text-muted-foreground tracking-widest">MODO VIBE</span>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 w-full">
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
          {/* Aikortex icon in center */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
            <img
              src={aikortexIcon}
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
        <p className="text-xs text-muted-foreground mb-5 capitalize">
          {agentType ? `Agente ${agentType}` : "Em construção"}
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
    </div>
  );
}
