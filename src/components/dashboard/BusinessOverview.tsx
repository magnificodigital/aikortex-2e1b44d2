import { Users, FolderKanban, CheckSquare, DollarSign, Zap, Bot } from "lucide-react";

const metrics = [
  { label: "Clientes Ativos", value: "47", change: "+5", icon: Users, accent: "primary" },
  { label: "Projetos Ativos", value: "18", change: "+2", icon: FolderKanban, accent: "info" },
  { label: "Tarefas Hoje", value: "12", change: "3 atrasadas", icon: CheckSquare, accent: "warning" },
  { label: "Receita Mensal", value: "R$ 124k", change: "+18%", icon: DollarSign, accent: "success" },
  { label: "Automações Ativas", value: "34", change: "+8", icon: Zap, accent: "primary" },
  { label: "Agentes IA", value: "9", change: "2 novos", icon: Bot, accent: "info" },
];

const accentMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-[hsl(var(--info)/.1)] text-[hsl(var(--info))]",
  warning: "bg-[hsl(var(--warning)/.1)] text-[hsl(var(--warning))]",
  success: "bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]",
};

const BusinessOverview = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
    {metrics.map((m) => (
      <div key={m.label} className="glass-card p-4 flex flex-col gap-3 hover:border-border transition-colors">
        <div className="flex items-center justify-between">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentMap[m.accent]}`}>
            <m.icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{m.change}</span>
        </div>
        <div>
          <div className="text-xl font-semibold text-foreground">{m.value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{m.label}</div>
        </div>
      </div>
    ))}
  </div>
);

export default BusinessOverview;
