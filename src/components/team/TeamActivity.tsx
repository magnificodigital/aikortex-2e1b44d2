import { mockActivityLog, mockTeamMembers } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TeamActivity = () => {
  const memberMap = Object.fromEntries(mockTeamMembers.map((m) => [m.id, m]));

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Atividade Recente</h3>
      <div className="space-y-3">
        {mockActivityLog.slice(0, 8).map((a) => {
          const user = memberMap[a.userId];
          return (
            <div key={a.id} className="flex items-start gap-3">
              <Avatar className="w-6 h-6 mt-0.5">
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                  {user?.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">
                  <span className="font-medium">{user?.fullName || "Usuário"}</span>{" "}
                  <span className="text-muted-foreground">{a.action.toLowerCase()}</span>{" "}
                  <span className="font-medium">{a.target}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(a.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamActivity;
