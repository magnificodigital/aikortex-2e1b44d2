import { TeamMember } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface TeamWorkloadProps {
  members: TeamMember[];
  onMemberClick: (member: TeamMember) => void;
}

const TeamWorkload = ({ members, onMemberClick }: TeamWorkloadProps) => {
  const active = members.filter((m) => m.status === "active" && m.assignedTasks > 0)
    .sort((a, b) => b.assignedTasks - a.assignedTasks);
  const maxTasks = Math.max(...active.map((m) => m.assignedTasks), 1);

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Carga de Trabalho da Equipe</h3>
      <div className="space-y-3">
        {active.map((m) => (
          <div key={m.id} className="flex items-center gap-3 cursor-pointer hover:bg-accent/40 rounded-lg p-2 -m-2 transition-colors" onClick={() => onMemberClick(m)}>
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground truncate">{m.fullName}</span>
                <div className="flex items-center gap-1.5">
                  {m.overdueTasks > 0 && (
                    <Badge variant="outline" className="text-[9px] text-destructive bg-destructive/10 border-0 gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> {m.overdueTasks}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{m.assignedTasks} tarefas</span>
                </div>
              </div>
              <Progress value={(m.assignedTasks / maxTasks) * 100} className="h-1.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamWorkload;
