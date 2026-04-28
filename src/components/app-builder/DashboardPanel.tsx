import { BarChart3, Users, MessageSquare, TrendingUp, Clock, Monitor, ArrowUp, ArrowDown, Activity, Database, Loader2 } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { useAppBuilder } from "@/contexts/AppBuilderContext";

interface DashboardPanelProps {
  channel?: "whatsapp" | "web";
}

const DashboardPanel = ({}: DashboardPanelProps) => {
  const { channel, dashboardMetrics, tables, isGenerating, appState, wizardStep } = useAppBuilder();

  const iconMap: Record<string, any> = {
    "Conversas Ativas": MessageSquare,
    "Leads Qualificados": Users,
    "Taxa de Resposta": Activity,
    "Tempo Médio": Clock,
    "Usuários Ativos": Users,
    "Pageviews": BarChart3,
    "Conversão": TrendingUp,
    "Bounce Rate": Activity,
    "Usuários": Users,
    "Conversas": MessageSquare,
    "Sessões": Activity,
    "Conversões": TrendingUp,
  };

  const appType = appState?.app_meta?.type || channel;
  const appName = appState?.app_meta?.name || "Meu App";

  // FIX: wizard concluído mas appState ainda não chegou → mostrar loading em vez de tela vazia
  const wizardDone = wizardStep === "done";
  const hasAppState = !!appState;
  const hasMetrics = dashboardMetrics.length > 0;
  const hasTables = tables.length > 0;

  const effectiveMetrics = hasMetrics
    ? dashboardMetrics
    : appType === "whatsapp"
      ? [
          { label: "Usuários", value: "0", change: "--", up: true },
          { label: "Conversas", value: "0", change: "--", up: true },
          { label: "Sessões", value: "0", change: "--", up: true },
        ]
      : [
          { label: "Usuários", value: "0", change: "--", up: true },
          { label: "Sessões", value: "0", change: "--", up: true },
          { label: "Conversões", value: "0", change: "--", up: true },
        ];

  const effectiveTables = appState?.database?.tables?.length
    ? appState.database.tables.map((table) => ({
        name: table.name,
        columns: table.columns.map((column) => ({
          name: column.name,
          type: column.type,
          isPK: column.name === "id",
          required: column.required,
        })),
      }))
    : tables;

  // FIX: Guard corrigido — mostra loading se wizard concluído mas estado ainda não chegou
  if (!hasAppState && !hasMetrics && !hasTables) {
    if (isGenerating || wizardDone) {
      // Wizard concluído ou gerando: mostrar loading em vez de tela vazia
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-xs">
              {channel === "whatsapp" ? "Gerando dashboard de conversas..." : "Gerando dashboard do app..."}
            </span>
          </div>
        </div>
      );
    }
    // Wizard não iniciado: mostrar instrução
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center px-8">
        <div>
          <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-xs">
            {channel === "whatsapp"
              ? "Crie um WhatsApp App no Studio para ver o dashboard aqui"
              : "Crie um Web App no Studio para ver o dashboard aqui"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Painel de Gestão</h2>
          <p className="text-xs text-muted-foreground">
            {appName} · {appType === "whatsapp" ? "WhatsApp App" : "Web App"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isGenerating && (
            <span className="flex items-center gap-1.5 text-[10px] text-primary animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
            </span>
          )}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            appType === "whatsapp"
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-primary/10 text-primary border-primary/20"
          }`}>
            {appType === "whatsapp" ? <WhatsAppIcon className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
            {appType === "whatsapp" ? "WhatsApp" : "Web App"}
          </span>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {effectiveMetrics.map((m) => {
          const Icon = iconMap[m.label] || BarChart3;
          const isPlaceholder = m.change === "--" || m.change === "placeholder";
          return (
            <div key={m.label} className="rounded-xl border border-border p-4 bg-card">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {!isPlaceholder && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-medium ${m.up ? "text-primary" : "text-destructive"}`}>
                    {m.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {m.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabelas */}
      {effectiveTables.length > 0 && (
        <div className="rounded-xl border border-border p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Tabelas do Banco</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">{effectiveTables.length} tabela(s)</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {effectiveTables.map((t) => (
              <div key={t.name} className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-foreground">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">{t.columns.length} colunas</span>
                </div>
                <div className="space-y-2">
                  {t.columns.map((column) => (
                    <div key={`${t.name}-${column.name}`} className="rounded-md border border-border/70 px-3 py-2 text-xs bg-card">
                      <span className="font-mono text-foreground">{column.name}</span>
                      <span className="text-muted-foreground">
                        :{String(column.type).toUpperCase()}
                        {("required" in column && column.required) ? " • obrigatório" : ""}
                        {column.isPK ? " • PK" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fluxos */}
      {appState?.flows && appState.flows.length > 0 && (
        <div className="rounded-xl border border-border p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Fluxos de Conversa</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {appState.flows.map((flow, i) => (
              <div key={flow.id || i} className="rounded-lg border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium text-foreground">{flow.name}</span>
                </div>
                {flow.description && (
                  <p className="text-[10px] text-muted-foreground pl-7">{flow.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPanel;
