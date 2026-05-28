import { useMemo } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Database,
  FlaskConical,
  GitBranch,
  Mail,
  MessageSquare,
  Plug,
  Send,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentCadences } from "@/hooks/use-agent-cadences";
import { useCadenceExecutionStats } from "@/hooks/use-cadence-executions";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useWhatsAppIntegrationStatus } from "@/hooks/use-whatsapp-integration";
import { useWhatsAppTemplates } from "@/hooks/use-whatsapp-templates";

interface Props {
  agentId?: string;
  agentName: string;
  agentVersion?: string | null;
  agentStatus?: "rascunho" | "publicado" | string;
  isInstructionsSet?: boolean;
  isTonalitySet?: boolean;
  onGoSection: (key: string) => void;
}

export default function AgentOverviewPanel({
  agentId,
  agentName,
  agentVersion,
  agentStatus,
  isInstructionsSet = false,
  isTonalitySet = false,
  onGoSection,
}: Props) {
  const isPublished = agentStatus === "publicado" || agentStatus === "published";

  const { data: cadences = [] } = useAgentCadences(agentId);
  const { data: stats, isLoading: statsLoading } = useCadenceExecutionStats(agentId);
  const { data: emailStatus } = useEmailIntegrationStatus();
  const { data: waStatus } = useWhatsAppIntegrationStatus();
  const { data: templates = [] } = useWhatsAppTemplates();

  const enabledCadences = cadences.filter((c) => c.enabled).length;
  const hasEmailChannel = !!emailStatus?.connected;
  const hasWhatsAppChannel = !!waStatus?.connected;
  const hasAnyChannel = hasEmailChannel || hasWhatsAppChannel;
  const approvedTemplatesCount = templates.filter((t) => t.status === "APPROVED").length;

  const checklist = useMemo(() => [
    {
      label: "Defina nome e instruções do agente",
      done: isInstructionsSet,
      onGo: () => onGoSection("config.agent"),
    },
    {
      label: "Configure o tom de voz",
      done: isTonalitySet,
      onGo: () => onGoSection("config.agent"),
    },
    {
      label: "Conecte pelo menos um canal (Email ou WhatsApp)",
      done: hasAnyChannel,
      onGo: () => onGoSection(hasEmailChannel ? "channels.email" : "channels.whatsapp"),
    },
    {
      label: "Crie pelo menos uma cadência",
      done: cadences.length > 0,
      onGo: () => onGoSection("behavior.cadences"),
    },
    {
      label: "Crie ao menos um template WhatsApp (se for usar esse canal)",
      done: !hasWhatsAppChannel || approvedTemplatesCount > 0,
      optional: !hasWhatsAppChannel,
      onGo: () => onGoSection("resources.wa_templates"),
    },
  ], [isInstructionsSet, isTonalitySet, hasAnyChannel, cadences.length, hasWhatsAppChannel, approvedTemplatesCount, onGoSection]);

  const completedCount = checklist.filter((c) => c.done).length;
  const totalCount = checklist.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const successRatePct = useMemo(() => {
    if (!stats || stats.successRate === 0) return "—";
    return `${Math.round(stats.successRate * 100)}%`;
  }, [stats]);

  // Sugestões de próximas ações
  const nextActions = useMemo(() => {
    const acts: { label: string; description: string; icon: any; onGo: () => void; primary?: boolean }[] = [];
    if (!hasAnyChannel) {
      acts.push({
        label: "Conectar canal",
        description: "Email ou WhatsApp pra começar a se comunicar",
        icon: Plug,
        onGo: () => onGoSection("channels.email"),
        primary: true,
      });
    }
    if (cadences.length === 0 && hasAnyChannel) {
      acts.push({
        label: "Criar primeira cadência",
        description: "Sequência de mensagens automáticas",
        icon: Clock,
        onGo: () => onGoSection("behavior.cadences"),
        primary: true,
      });
    }
    if (hasWhatsAppChannel && approvedTemplatesCount === 0) {
      acts.push({
        label: "Criar template WhatsApp",
        description: "Pra contatar fora da janela de 24h",
        icon: MessageSquare,
        onGo: () => onGoSection("resources.wa_templates"),
      });
    }
    if (!isInstructionsSet) {
      acts.push({
        label: "Definir instruções",
        description: "Como o agente deve se comportar",
        icon: Bot,
        onGo: () => onGoSection("config.agent"),
      });
    }
    acts.push({
      label: "Testar o agente",
      description: "Conversar como se fosse usuário real",
      icon: FlaskConical,
      onGo: () => onGoSection("ops.test"),
    });
    return acts.slice(0, 4);
  }, [hasAnyChannel, cadences.length, hasWhatsAppChannel, approvedTemplatesCount, isInstructionsSet, onGoSection]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground truncate">{agentName}</h2>
              {isPublished ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Publicado
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">Rascunho</Badge>
              )}
              {agentVersion && (
                <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                  <GitBranch className="w-2.5 h-2.5" /> {agentVersion}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {completedCount === totalCount
                ? "Setup completo. Tudo pronto pra rodar."
                : completedCount === 0
                ? "Comece a configurar seu agente nos próximos passos abaixo."
                : `${completedCount}/${totalCount} etapas concluídas. Veja o que falta abaixo.`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{progressPct}% configurado</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Execuções</p>
              <p className="text-xl font-bold leading-tight mt-0.5">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : (stats?.total ?? 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">total de cadências</p>
            </div>
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cadências</p>
              <p className="text-xl font-bold leading-tight mt-0.5 text-blue-600">
                {enabledCadences} <span className="text-xs font-normal text-muted-foreground">de {cadences.length}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">ativas</p>
            </div>
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sucesso</p>
              <p className="text-xl font-bold leading-tight mt-0.5 text-emerald-600">{successRatePct}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats?.completed ?? 0} ok · {stats?.failed ?? 0} falhas
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Canais</p>
              <p className="text-xl font-bold leading-tight mt-0.5 text-amber-600">
                {(hasEmailChannel ? 1 : 0) + (hasWhatsAppChannel ? 1 : 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                {[hasEmailChannel && "Email", hasWhatsAppChannel && "WhatsApp"].filter(Boolean).join(" · ") || "nenhum conectado"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Setup checklist */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Checklist de setup</h3>
        <Card className="divide-y divide-border">
          {checklist.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={item.onGo}
              className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors group"
            >
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`text-xs flex-1 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.label}
                {item.optional && !item.done && (
                  <span className="text-[10px] text-muted-foreground/70 ml-1.5">(opcional)</span>
                )}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </Card>
      </div>

      {/* Próximas ações */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Próximas ações</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {nextActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <Card
                key={i}
                className={`p-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm ${
                  a.primary ? "border-primary/30 bg-primary/5" : ""
                }`}
                onClick={a.onGo}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    a.primary ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{a.description}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Atalhos</h3>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Cadências", icon: Clock, key: "behavior.cadences" },
            { label: "Execuções", icon: Send, key: "ops.executions" },
            { label: "Email", icon: Mail, key: "channels.email" },
            { label: "WhatsApp", icon: MessageSquare, key: "channels.whatsapp" },
            { label: "Templates WhatsApp", icon: MessageSquare, key: "resources.wa_templates" },
            { label: "LLMs", icon: Plug, key: "integrations.llms" },
            { label: "MCPs & APIs", icon: Plug, key: "integrations.apis" },
            { label: "Ferramentas", icon: Wrench, key: "resources.tools" },
            { label: "Tabelas", icon: Database, key: "resources.tables" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Button
                key={s.key}
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={() => onGoSection(s.key)}
              >
                <Icon className="w-3 h-3" /> {s.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
