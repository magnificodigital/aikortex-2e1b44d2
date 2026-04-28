import { Task, priorityConfig, statusConfig } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { format, isAfter, isBefore, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { teamMembers } from "@/types/task";

interface TaskMyViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskMyView = ({ tasks, onTaskClick }: TaskMyViewProps) => {
  const [currentUser, setCurrentUser] = useState("Ana Silva");
  const myTasks = tasks.filter((t) => t.assignee === currentUser && t.status !== "done");
  const today = new Date();

  const overdue = myTasks.filter((t) => isBefore(new Date(t.dueDate), today));
  const dueToday = myTasks.filter((t) => isToday(new Date(t.dueDate)));
  const upcoming = myTasks.filter((t) => isAfter(new Date(t.dueDate), today) && !isToday(new Date(t.dueDate)));
  const completed = tasks.filter((t) => t.assignee === currentUser && t.status === "done");

  const totalTime = tasks
    .filter((t) => t.assignee === currentUser)
    .reduce((sum, t) => sum + t.timeEntries.filter((te) => te.user === currentUser).reduce((s, te) => s + te.duration, 0), 0);

  const sections = [
    { title: "Atrasadas", tasks: overdue, icon: AlertTriangle, iconColor: "text-destructive" },
    { title: "Hoje", tasks: dueToday, icon: Clock, iconColor: "text-[hsl(var(--warning))]" },
    { title: "Próximas", tasks: upcoming, icon: Calendar, iconColor: "text-[hsl(var(--info))]" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={currentUser} onValueChange={setCurrentUser}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pendentes", value: myTasks.length, color: "text-foreground" },
          { label: "Atrasadas", value: overdue.length, color: "text-destructive" },
          { label: "Concluídas", value: completed.length, color: "text-[hsl(var(--success))]" },
          { label: "Tempo Total", value: `${Math.round(totalTime / 60)}h`, color: "text-[hsl(var(--info))]" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-lg p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Task sections */}
      {sections.map(({ title, tasks: sectionTasks, icon: Icon, iconColor }) => sectionTasks.length > 0 && (
        <div key={title} className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <h3 className="text-xs font-semibold text-foreground">{title}</h3>
            <Badge variant="secondary" className="text-[10px] h-5">{sectionTasks.length}</Badge>
          </div>
          <div className="divide-y divide-border/30">
            {sectionTasks.map((task) => {
              const pc = priorityConfig[task.priority];
              const sc = statusConfig[task.status];
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <div className={`w-1.5 h-8 rounded-full`} style={{
                    backgroundColor: task.priority === "urgent" ? "hsl(var(--destructive))" :
                      task.priority === "high" ? "hsl(var(--warning))" :
                      task.priority === "medium" ? "hsl(var(--info))" :
                      "hsl(var(--muted-foreground))"
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">{task.projectName} • {task.clientName}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${sc.color} ${sc.bg} border-0`}>{sc.label}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskMyView;
