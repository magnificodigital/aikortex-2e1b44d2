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
  // ── 🧠 PENSANDO (2 steps) — entendimento do contexto ──
  { id: "analyze", label: "Analisando sua descrição",         done: () => true },
  { id: "niche",   label: "Identificando perfil do agente", done: (cfg) => !!cfg?.businessContext?.niche },

  // ── 📋 PLANEJANDO (6 steps) — persona + perfil + capacidades ──
  // (Empresa não é mais um passo separado — é perguntada na Fase Descoberta
  // ou puxada da agency_profile do user antes da geração.)
  { id: "name",         label: "Nomeando o agente",                     done: (cfg) => !!cfg?.name && cfg.name !== "Novo Agente" && cfg.name !== "Carregando..." },
  { id: "description",  label: "Escrevendo a descrição do agente",      done: (cfg) => !!cfg?.descriptionConfigured },
  { id: "tone",         label: "Definindo o tom de voz",                done: (cfg) => !!(cfg?.businessContext?.toneOfVoice || cfg?.toneOfVoice) },
  { id: "objective",    label: "Estruturando o objetivo principal",     done: (cfg) => !!(cfg?.profile?.primaryGoal || cfg?.objective) },
  { id: "capabilities", label: "Ativando capacidades cognitivas",       done: (cfg) => {
      // agent-vibe-mutate salva capabilities como boolean direto: { planning: true }
      // (NÃO como { planning: { enabled: true } })
      const caps = cfg?.capabilities ?? {};
      return Object.values(caps).some((c: any) => c === true || c?.enabled === true);
    },
  },

  // ── 🔨 DESENVOLVENDO (6 steps) — canais + integrações + tools + texto ──
  { id: "channels", label: "Selecionando canais de comunicação", done: (cfg) => {
      const ch = cfg?.channels;
      if (Array.isArray(ch)) return ch.length > 0;
      if (ch && typeof ch === "object") return Object.values(ch).some((v) => v === true);
      return false;
    },
  },
  { id: "integrations", label: "Mapeando integrações externas",         done: (cfg) => Array.isArray(cfg?.externalIntegrations) && cfg.externalIntegrations.length > 0 },
  { id: "tools",        label: "Habilitando ferramentas runtime",       done: (cfg) => Array.isArray(cfg?.enabledTools) && cfg.enabledTools.length > 0 },
  { id: "instructions", label: "Escrevendo as instruções operacionais", done: (cfg) => {
      // vibe-mutate salva em profile.instructions; legacy raiz.
      // Exige ≥1200 chars pra cobrir as 7 seções do prompt (identidade, tom,
      // fluxo, critérios, regras, exceções, exemplos) com profundidade.
      const instr = cfg?.profile?.instructions ?? cfg?.instructions;
      return !!(typeof instr === "string" && instr.length > 1200);
    },
  },
  { id: "greeting",     label: "Criando a mensagem de saudação",        done: (cfg) => !!(cfg?.businessContext?.greetingMessage || cfg?.greetingMessage) },
  { id: "finalize",     label: "Finalizando o agente",                  done: (cfg) => !!cfg?.wizard_completed },
];

export default function WizardThinkingCard({ savedConfig }: WizardThinkingCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Calcula status real de cada step a partir do savedConfig vivo
  const statuses = STEPS.map((s) => s.done(savedConfig));
  const doneCount = statuses.filter(Boolean).length;
  const totalCount = STEPS.length;
  const pct = Math.round((doneCount / totalCount) * 100);
  // current = primeiro pendente APÓS o último feito (steps pulados não travam).
  const lastDoneIdx = statuses.lastIndexOf(true);
  const currentIdx = (() => {
    if (lastDoneIdx === -1) return statuses.findIndex((d) => !d);
    for (let i = lastDoneIdx + 1; i < statuses.length; i++) {
      if (!statuses[i]) return i;
    }
    return -1;
  })();
  // Steps "skipped" (anteriores ao lastDoneIdx mas não feitos) são ESCONDIDOS
  // — sem linha riscada, sem rótulo "(pulado)". Só mostra o que aconteceu de fato.
  const skippedSet = new Set<number>();
  for (let i = 0; i < lastDoneIdx; i++) {
    if (!statuses[i]) skippedSet.add(i);
  }

  // Frase principal varia conforme progresso
  const headline =
    currentIdx === -1
      ? "Agente quase pronto..."
      : pct < 25
      ? "Iniciando construção..."
      : pct < 60
      ? "Construindo seu agente..."
      : pct < 90
      ? "Finalizando detalhes..."
      : "Quase lá, finalizando...";

  return (
    <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-4 shadow-lg shadow-primary/10 overflow-hidden">
      {/* Shimmer ambient pra dar vida */}
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-primary/20 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-primary/15 blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 flex gap-3">
        {/* Ícone Aikortex pulsante grande */}
        <div className="relative w-12 h-12 shrink-0 mt-0.5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 ring-2 ring-primary/40 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />
          {/* Spinner ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/60 animate-spin" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={isDark ? aikortexIconWhite : aikortexIconBlack}
              alt="Aikortex"
              className="w-6 h-6 object-contain"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Headline + porcentagem */}
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-sm font-bold text-foreground">{headline}</p>
            <span className="text-xs font-mono font-bold text-primary tabular-nums">{pct}%</span>
          </div>

          {/* Barra de progresso animada */}
          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-700 ease-out relative"
              style={{ width: `${pct}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Lista flat de steps */}
          <ul className="space-y-1 ml-0.5 border-l border-border/40 pl-3">
            {STEPS.map((step, idx) => {
              const done = statuses[idx];
              const isSkipped = skippedSet.has(idx);
              if (isSkipped) return null;
              const reached = done || idx === currentIdx || idx < currentIdx;
              if (!reached) return null;
              const isCurrent = idx === currentIdx;
              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground/80"
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
                    {isCurrent ? "..." : ""}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Subtítulo motivacional embaixo */}
          {currentIdx !== -1 && (
            <p className="text-[10px] text-muted-foreground/70 mt-3 italic">
              Isso leva uns 20-30 segundos — montando tudo direitinho.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
