import { Task, priorityConfig, statusConfig } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Calendar, Repeat, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskListView = ({ tasks, onTaskClick }: TaskListViewProps) => {
  const grouped = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.projectName || "Sem Projeto";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([project, projectTasks]) => (
        <div key={project} className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 bg-accent/30">
            <h3 className="text-xs font-semibold text-foreground">{project}</h3>
            <span className="text-[10px] text-muted-foreground">{projectTasks.length} tarefas</span>
          </div>
          <div className="divide-y divide-border/30">
            {projectTasks.map((task) => {
              const pc = priorityConfig[task.priority];
              const sc = statusConfig[task.status];
              const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
              const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "done";

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors group"
                >
                  <Checkbox
                    checked={task.status === "done"}
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </span>
                      {task.recurring && <Repeat className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">{task.clientName}</span>
                      {task.subtasks.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {completedSubtasks}/{task.subtasks.length} subtarefas
                        </span>
                      )}
                      {task.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${pc.color} ${pc.bg} border-0`}>
                      {pc.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${sc.color} ${sc.bg} border-0`}>
                      {sc.label}
                    </Badge>
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

export default TaskListView;
