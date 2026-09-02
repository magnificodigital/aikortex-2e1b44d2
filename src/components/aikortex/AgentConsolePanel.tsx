import type { ReactNode } from "react";
import { computeWizardSections } from "@/lib/wizard-progress";
import { agentTypeLabel } from "@/lib/agent-type-labels";
import { Bot, Cpu, MessageSquare, Wrench, BookOpen, ShieldCheck, Activity, Rocket, FlaskConical } from "lucide-react";

// Console do agente estilo Clint — abas read-only Resumo e Analisar.
// Reaproveita computeWizardSections pra extrair identidade/tom/tools/canais/base.
// Configurar/Testar continuam sendo o chat (renderizados pelo AgentDetail).

interface Props {
  tab: "resumo" | "analisar" | "sessoes" | "historico";
  savedConfig?: Record<string, any> | null;
  agentName?: string;
  agentType?: string;
  model?: string;
  isPublished?: boolean;
  publishedNumber?: number | null;
  testUsed?: number;
  testLimit?: number;
  messagesCount?: number;
}

const Stat = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: ReactNode; hint?: string }) => (
  <div className="rounded-xl border border-border bg-card/40 p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className="text-lg font-semibold text-foreground leading-tight">{value}</div>
    {hint && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{hint}</p>}
  </div>
);

export default function AgentConsolePanel({
  tab, savedConfig, agentName, agentType, model, isPublished, publishedNumber, testUsed = 0, testLimit = 40, messagesCount = 0,
}: Props) {
  const { sections, readyCount } = computeWizardSections(savedConfig);
  const total = sections.length;
  const healthPct = Math.round((readyCount / total) * 100);
  const cfg = (savedConfig ?? {}) as Record<string, any>;
  const objective = cfg?.profile?.primaryGoal || cfg.objective || (cfg.businessContext?.niche ? `Atender no nicho de ${cfg.businessContext.niche}` : "");
  const description = cfg.description || cfg.descriptionConfigured || objective;
  const toolsSection = sections.find((s) => s.id === "tools");
  const channelsSection = sections.find((s) => s.id === "channels");
  const kbSection = sections.find((s) => s.id === "knowledge");

  if (tab === "resumo") {
    return (
      <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
        {/* O que este agente faz */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground">{agentName || "Agente"}</h2>
              <p className="text-xs text-muted-foreground">{agentType && agentType !== "Custom" ? agentTypeLabel(agentType) : "Personalizado"}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-snug">
                {description || "Descreva o que este agente faz no chat de configuração."}
              </p>
            </div>
          </div>
        </div>

        {/* Stats principais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat icon={Cpu} label="Modelo" value={<span className="text-sm font-mono">{model || "—"}</span>} />
          <Stat icon={MessageSquare} label="Canais" value={channelsSection?.status === "ready" ? channelsSection.detail : "Nenhum"} />
          <Stat icon={ShieldCheck} label="Status" value={isPublished ? `Publicado · v${publishedNumber ?? 1}` : "Rascunho"} hint={isPublished ? undefined : "ainda não publicado"} />
        </div>

        {/* Ferramentas */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Wrench className="w-4 h-4 text-primary" /> Ferramentas que o agente usa
          </div>
          {toolsSection?.items && toolsSection.items.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {toolsSection.items.map((it, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">{it}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma ferramenta ativada ainda.</p>
          )}
          {kbSection?.status === "ready" && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Base de conhecimento: {kbSection.detail}
            </p>
          )}
        </div>

        {/* Saúde rápida */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Activity className="w-4 h-4 text-primary" /> Saúde da configuração</span>
            <span className="text-sm font-semibold text-foreground">{readyCount}/{total} seções</span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all" style={{ width: `${healthPct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (tab === "analisar") {
    const testRemaining = Math.max(0, testLimit - testUsed);
    return (
      <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-5">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Análise</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={ShieldCheck} label="Nota de saúde" value={`${healthPct}/100`} hint={`${readyCount}/${total} seções`} />
          <Stat icon={FlaskConical} label="Testes usados" value={`${testUsed}/${testLimit}`} hint={`${testRemaining} restantes`} />
          <Stat icon={MessageSquare} label="Mensagens" value={messagesCount} hint="nesta sessão" />
          <Stat icon={Rocket} label="Publicação" value={isPublished ? `v${publishedNumber ?? 1}` : "—"} hint={isPublished ? "publicado" : "rascunho"} />
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Fatores da saúde</p>
          <div className="space-y-2">
            {sections.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className={s.status === "ready" ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "ready" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted/50 text-muted-foreground/70"}`}>
                  {s.status === "ready" ? "ok" : (s.optional ? "opcional" : "faltando")}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/60">Métricas de produção (sessões reais, custo, taxa de erro) aparecem aqui depois que o agente for publicado e começar a atender.</p>
      </div>
    );
  }

  // sessoes / historico — placeholders honestos (reaproveitam infra existente depois)
  return (
    <div className="h-full grid place-items-center p-6 text-center">
      <div className="max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-muted/50 grid place-items-center mx-auto mb-3 text-muted-foreground">
          {tab === "sessoes" ? <MessageSquare className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
        </div>
        <p className="text-sm font-medium text-foreground">
          {tab === "sessoes" ? "Sessões" : "Histórico"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {tab === "sessoes"
            ? "As conversas reais do agente aparecem aqui depois de publicado."
            : "O histórico de versões do agente aparece aqui após a primeira publicação."}
        </p>
      </div>
    </div>
  );
}
