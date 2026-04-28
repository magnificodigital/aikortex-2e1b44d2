import { TaskEngineItem, STATUS_CONFIG, PRIORITY_CONFIG, getChildren, getProjects } from "@/types/task-engine";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  items: TaskEngineItem[];
  onItemClick: (item: TaskEngineItem) => void;
}

const UnifiedTaskList = ({ items, onItemClick }: Props) => {
  const tasks = items.filter((i) => i.task_type === "task");
  const projects = getProjects(items);

  const grouped = tasks.reduce<Record<string, TaskEngineItem[]>>((acc, task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const key = project?.title || "Sem Projeto";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([projectName, projectTasks]) => (
        <div key={projectName} className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 bg-accent/30">
            <h3 className="text-xs font-semibold text-foreground">{projectName}</h3>
            <span className="text-[10px] text-muted-foreground">{projectTasks.length} tarefas</span>
          </div>
          <div className="divide-y divide-border/30">
            {projectTasks.map((task) => {
              const pc = PRIORITY_CONFIG[task.priority];
              const sc = STATUS_CONFIG[task.status];
              const subtasks = getChildren(items, task.id);
              const completedSubs = subtasks.filter((s) => s.status === "completed").length;
              const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "completed";

              return (
                <div
                  key={task.id}
                  onClick={() => onItemClick(task)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors group"
                >
                  <Checkbox checked={task.status === "completed"} className="shrink-0" onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">{task.clientName}</span>
                      {subtasks.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{completedSubs}/{subtasks.length} subtarefas</span>
                      )}
                      {task.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${pc.color} ${pc.bg} border-0`}>{pc.label}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${sc.color} ${sc.bg} border-0`}>{sc.label}</Badge>
                    <div className="flex items-center gap-1">
                      <Calendar className={`w-3 h-3 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
                      <span className={`text-[10px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {task.assignee.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UnifiedTaskList;
