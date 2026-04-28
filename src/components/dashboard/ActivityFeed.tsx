import { UserPlus, CheckSquare, Zap, MessageSquare, Phone } from "lucide-react";

const activities = [
  { icon: UserPlus, label: "Novo lead: Marina Silva", time: "2 min", color: "text-[hsl(var(--success))]" },
  { icon: CheckSquare, label: "Tarefa concluída: Deploy chatbot", time: "8 min", color: "text-primary" },
  { icon: Zap, label: "Automação disparada: Welcome Flow", time: "15 min", color: "text-[hsl(var(--warning))]" },
  { icon: MessageSquare, label: "Mensagem de TechCorp", time: "22 min", color: "text-[hsl(var(--info))]" },
  { icon: Phone, label: "Agente voz: 3 chamadas concluídas", time: "30 min", color: "text-primary" },
  { icon: UserPlus, label: "Novo lead: João Pereira", time: "45 min", color: "text-[hsl(var(--success))]" },
  { icon: Zap, label: "Automação: Follow-up email", time: "1h", color: "text-[hsl(var(--warning))]" },
  { icon: CheckSquare, label: "Tarefa criada: Revisão contrato", time: "1h", color: "text-primary" },
];

const ActivityFeed = () => (
  <div className="glass-card rounded-xl flex flex-col h-full">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
      <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
      <span className="text-[10px] text-primary font-medium cursor-pointer hover:underline">Ver tudo</span>
    </div>
    <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group">
          <div className={`w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 ${a.color}`}>
            <a.icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{a.label}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ActivityFeed;
