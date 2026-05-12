import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Wrench } from "lucide-react";
import { AGENT_TOOLS_LIST, type Tier } from "@/types/agent-tools";
import { useAgentTools } from "@/hooks/use-agent-tools";
import { toast } from "sonner";

interface Props {
  agentId?: string;
  tier?: Tier;
}

const TIER_LABEL: Record<Tier, string> = {
  starter: "Starter",
  explorer: "Explorer",
  hack: "Hack",
};

const AgentToolsSection = ({ agentId, tier = "starter" }: Props) => {
  const { isEnabled, setEnabled, usage, activeCount } = useAgentTools(agentId);

  if (!agentId) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Salve o agente antes de configurar tools.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Tools
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Capacidades dinâmicas que o agente pode invocar durante a conversa.
          </p>
        </div>
        <Badge variant="secondary">
          {activeCount} ativa{activeCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="space-y-3">
        {AGENT_TOOLS_LIST.map((tool) => {
          const enabled = isEnabled(tool.key);
          const quota = tool.quotas[tier];
          const used = usage[tool.key] || 0;
          const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
          const Icon = tool.icon;
          return (
            <div
              key={tool.key}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tool.shortLabel}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={async (v) => {
                    await setEnabled(tool.key, v);
                    toast.success(v ? `${tool.name} ativada.` : `${tool.name} desativada.`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Cota {TIER_LABEL[tier]}: {used} / {quota}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  asChild
                >
                  <a href={tool.secretHelpUrl} target="_blank" rel="noreferrer">
                    Configurar {tool.requiredSecret} <ExternalLink className="w-3 h-3 ml-1 inline" />
                  </a>
                </Button>
              </div>
              <Progress value={pct} className="h-1.5" />
              {used >= quota && quota > 0 && (
                <p className="text-[11px] text-destructive">
                  Cota mensal atingida — chamadas serão bloqueadas até o próximo mês.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        As chamadas de tool são contabilizadas por agência. Se a chave do serviço não estiver
        configurada no projeto, a tool retorna erro estruturado <code className="px-1 rounded bg-muted">MISSING_SECRET</code>.
      </p>
    </div>
  );
};

export default AgentToolsSection;
