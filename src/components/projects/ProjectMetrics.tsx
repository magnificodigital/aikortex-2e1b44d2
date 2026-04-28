import { type TaskEngineItem, getProjectTasks, getOverdueTasks } from "@/types/task-engine";
import { FolderKanban, CheckCircle2, AlertTriangle, Clock, Zap, ListTodo } from "lucide-react";

interface Props {
  items: TaskEngineItem[];
  projects: TaskEngineItem[];
}

const ProjectMetrics = ({ items, projects }: Props) => {
  const allTasks = items.filter((i) => i.task_type === "task");
  const doneTasks = allTasks.filter((t) => t.status === "completed").length;
  const overdue = getOverdueTasks(allTasks).length;
  const activeProjects = projects.filter((p) => p.status === "in_progress").length;
  const blockedProjects = projects.filter((p) => p.status === "blocked").length;
  const totalHours = allTasks.reduce((s, t) => s + t.estimatedHours, 0);

  const metrics = [
    { label: "Projetos Ativos", value: activeProjects, icon: FolderKanban, color: "text-primary" },
    { label: "Tarefas", value: `${doneTasks}/${allTasks.length}`, icon: CheckCircle2, color: "text-[hsl(var(--success))]" },
    { label: "Atrasadas", value: overdue, icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
    { label: "Bloqueados", value: blockedProjects, icon: Zap, color: "text-destructive" },
    { label: "Horas Estimadas", value: `${totalHours}h`, icon: Clock, color: "text-muted-foreground" },
    { label: "Conclusão", value: `${allTasks.length ? Math.round((doneTasks / allTasks.length) * 100) : 0}%`, icon: ListTodo, color: "text-[hsl(var(--info))]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${m.color}`}>
            <m.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectMetrics;
