import { Circle, AlertTriangle, Clock } from "lucide-react";

const tasks = [
  { title: "Configurar pipeline ML", project: "FinanceAI", due: "Hoje", status: "urgent" },
  { title: "Revisar contrato SalesUp", project: "SalesUp", due: "Hoje", status: "today" },
  { title: "Deploy chatbot v2", project: "TechCorp", due: "Amanhã", status: "upcoming" },
  { title: "Apresentação DataViz", project: "DataViz", due: "Atrasada", status: "overdue" },
  { title: "Integrar API pagamentos", project: "HealthPlus", due: "Hoje", status: "today" },
];

const statusConfig: Record<string, { icon: typeof Circle; color: string }> = {
  urgent: { icon: AlertTriangle, color: "text-destructive" },
  overdue: { icon: AlertTriangle, color: "text-destructive" },
  today: { icon: Clock, color: "text-[hsl(var(--warning))]" },
  upcoming: { icon: Circle, color: "text-muted-foreground" },
};

const TaskOverview = () => (
  <div className="glass-card flex flex-col h-full">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <h2 className="text-sm font-semibold text-foreground">Minhas Tarefas</h2>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-destructive font-medium">1 atrasada</span>
        <span className="text-[10px] text-[hsl(var(--warning))] font-medium">3 hoje</span>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-2">
      {tasks.map((t, i) => {
        const sc = statusConfig[t.status];
        return (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
            <sc.icon className={`w-3.5 h-3.5 shrink-0 ${sc.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
              <p className="text-[10px] text-muted-foreground">{t.project}</p>
            </div>
            <span className={`text-[10px] font-medium ${sc.color}`}>{t.due}</span>
          </div>
        );
      })}
    </div>
  </div>
);

export default TaskOverview;
