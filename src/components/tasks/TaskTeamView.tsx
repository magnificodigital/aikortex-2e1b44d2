import { Task, teamMembers, priorityConfig, statusConfig } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckSquare, AlertTriangle } from "lucide-react";

interface TaskTeamViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskTeamView = ({ tasks, onTaskClick }: TaskTeamViewProps) => {
  const memberStats = teamMembers.map((member) => {
    const memberTasks = tasks.filter((t) => t.assignee === member);
    const done = memberTasks.filter((t) => t.status === "done").length;
    const overdue = memberTasks.filter((t) => new Date(t.dueDate) < new Date() && t.status !== "done").length;
    const inProgress = memberTasks.filter((t) => t.status === "in_progress").length;
    const totalTime = memberTasks.reduce(
      (sum, t) => sum + t.timeEntries.filter((te) => te.user === member).reduce((s, te) => s + te.duration, 0), 0
    );
    return { member, total: memberTasks.length, done, overdue, inProgress, totalTime, tasks: memberTasks };
  }).filter((m) => m.total > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {memberStats.map(({ member, total, done, overdue, inProgress, totalTime, tasks: memberTasks }) => (
        <div key={member} className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {member.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{member}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{total} tarefas</span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {Math.round(totalTime / 60)}h registradas
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {overdue > 0 && (
                <Badge variant="outline" className="text-[9px] text-destructive bg-destructive/10 border-0 gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> {overdue}
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] text-[hsl(var(--success))] bg-[hsl(var(--success)/.1)] border-0">
                {done}/{total}
              </Badge>
            </div>
          </div>
          <div className="px-4 py-2">
            <Progress value={(done / total) * 100} className="h-1.5 mb-2" />
          </div>
          <div className="divide-y divide-border/20">
            {memberTasks.filter((t) => t.status !== "done").slice(0, 4).map((task) => {
              const pc = priorityConfig[task.priority];
              const sc = statusConfig[task.status];
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">{task.projectName}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${pc.color} ${pc.bg} border-0`}>{pc.label}</Badge>
                  <Badge variant="outline" className={`text-[9px] ${sc.color} ${sc.bg} border-0`}>{sc.label}</Badge>
                </div>
              );
            })}
            {memberTasks.filter((t) => t.status !== "done").length > 4 && (
              <div className="px-4 py-2 text-center">
                <span className="text-[10px] text-muted-foreground">
                  +{memberTasks.filter((t) => t.status !== "done").length - 4} mais
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskTeamView;
