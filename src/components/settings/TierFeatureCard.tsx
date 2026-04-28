import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, Settings2 } from "lucide-react";
import { FeatureFlag, FEATURE_FLAG_LABELS, PartnerTier } from "@/types/rbac";

// ─── Sub-feature definitions per module ─────────────
export interface SubFeature {
  key: string;
  label: string;
}

export const MODULE_SUB_FEATURES: Partial<Record<FeatureFlag, SubFeature[]>> = {
  "module.agents": [
    { key: "agent.sdr", label: "Template SDR" },
    { key: "agent.sac", label: "Template SAC" },
    { key: "agent.custom", label: "Agente Personalizado" },
    { key: "agent.voice", label: "Agente de Voz" },
    { key: "agent.multimodel", label: "Multi-modelo (trocar LLM)" },
    { key: "agent.publish", label: "Publicar Agente" },
  ],
  "module.flows": [
    { key: "flow.create", label: "Criar Flows" },
    { key: "flow.templates", label: "Templates de Flows" },
    { key: "flow.advanced_nodes", label: "Nós Avançados (API, Webhook)" },
    { key: "flow.copilot", label: "Copiloto de Flows" },
  ],
  "module.apps": [
    { key: "app.create", label: "Criar Apps" },
    { key: "app.database", label: "Banco de Dados do App" },
    { key: "app.deploy", label: "Publicar/Deploy" },
    { key: "app.custom_domain", label: "Domínio Customizado" },
  ],
  "module.templates": [
    { key: "tpl.sdr", label: "Template SDR" },
    { key: "tpl.sac", label: "Template SAC" },
    { key: "tpl.flow_comercial", label: "Flows Comerciais" },
    { key: "tpl.flow_atendimento", label: "Flows de Atendimento" },
    { key: "tpl.flow_cs", label: "Flows de Customer Success" },
    { key: "tpl.flow_marketing", label: "Flows de Marketing" },
    { key: "tpl.community", label: "Templates da Comunidade" },
  ],
  "module.messages": [
    { key: "msg.whatsapp", label: "WhatsApp" },
    { key: "msg.webchat", label: "Chat Web" },
    { key: "msg.history", label: "Histórico Completo" },
    { key: "msg.media", label: "Envio de Mídias" },
  ],
  "module.broadcasts": [
    { key: "bcast.create", label: "Criar Disparos" },
    { key: "bcast.schedule", label: "Agendamento" },
    { key: "bcast.segmentation", label: "Segmentação Avançada" },
    { key: "bcast.analytics", label: "Relatórios de Disparo" },
  ],
  "module.clients": [
    { key: "cli.manage", label: "Cadastro de Clientes" },
    { key: "cli.health_score", label: "Health Score" },
    { key: "cli.timeline", label: "Timeline do Cliente" },
    { key: "cli.import_export", label: "Importar/Exportar" },
  ],
  "module.contracts": [
    { key: "ctr.create", label: "Criar Contratos" },
    { key: "ctr.signature", label: "Assinatura Digital" },
    { key: "ctr.templates", label: "Templates de Contrato" },
    { key: "ctr.renewal", label: "Renovação Automática" },
  ],
  "module.sales": [
    { key: "sales.pipeline", label: "Pipeline de Vendas" },
    { key: "sales.proposals", label: "Propostas" },
    { key: "sales.forecasting", label: "Forecast de Receita" },
    { key: "sales.commission", label: "Comissões" },
  ],
  "module.crm": [
    { key: "crm.kanban", label: "Kanban de Leads" },
    { key: "crm.scoring", label: "Lead Scoring" },
    { key: "crm.automation", label: "Automação de CRM" },
    { key: "crm.reports", label: "Relatórios de CRM" },
  ],
  "module.meetings": [
    { key: "meet.create", label: "Criar Reuniões" },
    { key: "meet.recording", label: "Gravação" },
    { key: "meet.translation", label: "Tradução em Tempo Real" },
    { key: "meet.mentor", label: "Sales Mentor (IA)" },
  ],
  "module.financial": [
    { key: "fin.invoices", label: "Faturas" },
    { key: "fin.expenses", label: "Despesas" },
    { key: "fin.cashflow", label: "Fluxo de Caixa" },
    { key: "fin.reports", label: "Relatórios Financeiros" },
    { key: "fin.budget", label: "Orçamento" },
  ],
  "module.team": [
    { key: "team.manage", label: "Gerenciar Membros" },
    { key: "team.performance", label: "Performance" },
    { key: "team.workload", label: "Carga de Trabalho" },
    { key: "team.feedback", label: "Feedback 360°" },
  ],
  "module.tasks": [
    { key: "task.kanban", label: "Kanban" },
    { key: "task.calendar", label: "Calendário" },
    { key: "task.my_view", label: "Minha Visão" },
    { key: "task.team_view", label: "Visão de Equipe" },
    { key: "task.automation", label: "Automação de Tarefas" },
  ],
  "feature.ai_agents": [
    { key: "ai.multi_model", label: "Múltiplos Modelos" },
    { key: "ai.fine_tuning", label: "Ajuste Fino" },
    { key: "ai.knowledge_base", label: "Base de Conhecimento" },
  ],
  "feature.voice_agents": [
    { key: "voice.inbound", label: "Chamadas Receptivas" },
    { key: "voice.outbound", label: "Chamadas Ativas" },
    { key: "voice.custom_voice", label: "Voz Personalizada" },
  ],
  "feature.saas_builder": [
    { key: "saas.white_label", label: "White Label" },
    { key: "saas.custom_domain", label: "Domínio Próprio" },
    { key: "saas.billing", label: "Billing Integrado" },
  ],
  "feature.advanced_automation": [
    { key: "auto.webhooks", label: "Webhooks" },
    { key: "auto.api", label: "Integração via API" },
    { key: "auto.schedules", label: "Agendamentos" },
  ],
  "feature.custom_reports": [
    { key: "report.builder", label: "Construtor de Relatórios" },
    { key: "report.export", label: "Exportação PDF/CSV" },
    { key: "report.schedule", label: "Agendamento de Envio" },
  ],
};

// ─── Sub-feature state type ─────────────────────────
export type TierSubFeatures = Record<PartnerTier, Record<string, boolean>>;

export const initTierSubFeatures = (): TierSubFeatures => {
  const result: TierSubFeatures = { starter: {}, explorer: {}, hack: {} };
  // Hack has everything enabled by default
  for (const [, subs] of Object.entries(MODULE_SUB_FEATURES)) {
    for (const sub of subs ?? []) {
      result.hack[sub.key] = true;
      result.explorer[sub.key] = false;
      result.starter[sub.key] = false;
    }
  }
  // Explorer: enable basic sub-features
  for (const [flag, subs] of Object.entries(MODULE_SUB_FEATURES)) {
    if (!subs) continue;
    // Enable the first 2 sub-features for explorer by default
    subs.slice(0, 2).forEach(s => { result.explorer[s.key] = true; });
  }
  // Starter: enable only first sub-feature
  for (const [flag, subs] of Object.entries(MODULE_SUB_FEATURES)) {
    if (!subs) continue;
    if (subs[0]) result.starter[subs[0].key] = true;
  }
  return result;
};

// ─── Component ──────────────────────────────────────

interface TierFeatureCardProps {
  flag: FeatureFlag;
  enabled: boolean;
  onToggle: () => void;
  subFeatures: Record<string, boolean>;
  onToggleSubFeature: (subKey: string) => void;
}

const TierFeatureCard = ({ flag, enabled, onToggle, subFeatures, onToggleSubFeature }: TierFeatureCardProps) => {
  const [open, setOpen] = useState(false);
  const subs = MODULE_SUB_FEATURES[flag];
  const hasSubs = subs && subs.length > 0;
  const enabledSubCount = hasSubs ? subs.filter(s => subFeatures[s.key]).length : 0;

  return (
    <Collapsible open={open && enabled && hasSubs} onOpenChange={setOpen}>
      <div
        className={`rounded-lg border transition-colors ${
          enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
        }`}
      >
        {/* Main toggle row */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{FEATURE_FLAG_LABELS[flag]}</p>
              <p className="text-xs text-muted-foreground">
                {flag}
                {hasSubs && enabled && (
                  <span className="ml-2 text-primary">
                    ({enabledSubCount}/{subs.length} sub-funções)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasSubs && enabled && (
              <CollapsibleTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
            )}
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>
        </div>

        {/* Sub-features panel */}
        {hasSubs && (
          <CollapsibleContent>
            <div className="border-t border-border/50 px-4 py-3 space-y-2 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span>Configuração detalhada</span>
              </div>
              {subs.map(sub => (
                <label
                  key={sub.key}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={!!subFeatures[sub.key]}
                    onCheckedChange={() => onToggleSubFeature(sub.key)}
                  />
                  <span className="text-sm text-foreground">{sub.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
};

export default TierFeatureCard;
