import { Task } from "@/types/task";
import { CheckSquare, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface TaskMetricsProps {
  tasks: Task[];
}

const TaskMetrics = ({ tasks }: TaskMetricsProps) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter((t) => new Date(t.dueDate) < new Date() && t.status !== "done").length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const metrics = [
    { label: "Total de Tarefas", value: total, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
    { label: "Em Progresso", value: inProgress, icon: Clock, color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/.1)]" },
    { label: "Atrasadas", value: overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Taxa de Conclusão", value: `${completionRate}%`, icon: TrendingUp, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center`}>
            <m.icon className={`w-5 h-5 ${m.color}`} />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskMetrics;
