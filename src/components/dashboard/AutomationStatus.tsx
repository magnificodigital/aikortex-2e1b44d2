import { Zap, Bot, MessageCircle, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Automações Rodando", value: "34", icon: Zap, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
  { label: "Agentes IA Ativos", value: "9", icon: Bot, color: "text-primary", bg: "bg-primary/10" },
  { label: "Volume Conversas", value: "1.2k", icon: MessageCircle, color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/.1)]" },
  { label: "Erros", value: "3", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
];

const AutomationStatus = () => (
  <div className="glass-card rounded-xl">
    <div className="px-5 py-3.5 border-b border-border/50">
      <h2 className="text-sm font-semibold text-foreground">Automação & IA</h2>
    </div>
    <div className="grid grid-cols-2 gap-3 p-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg}`}>
            <s.icon className={`w-4 h-4 ${s.color}`} />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AutomationStatus;
