import { TeamMember, roleConfig, statusConfig, departmentConfig } from "@/types/team";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, MoreHorizontal } from "lucide-react";

interface TeamTableProps {
  members: TeamMember[];
  onView: (member: TeamMember) => void;
  onEdit: (member: TeamMember) => void;
}

const TeamTable = ({ members, onView, onEdit }: TeamTableProps) => {
  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead>Membro</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Função</TableHead>
            <TableHead className="text-center">Tarefas</TableHead>
            <TableHead className="text-center">Projetos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const rc = roleConfig[m.role];
            const sc = statusConfig[m.status];
            const dc = departmentConfig[m.department];
            return (
              <TableRow key={m.id} className="border-border/30 hover:bg-accent/40 cursor-pointer" onClick={() => onView(m)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.fullName}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><span className="text-sm text-foreground">{m.jobTitle}</span></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${dc.color} ${dc.bg} border-0`}>{dc.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${rc.color} ${rc.bg} border-0`}>{rc.label}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-foreground">{m.assignedTasks}</span>
                  {m.overdueTasks > 0 && (
                    <span className="text-[10px] text-destructive ml-1">({m.overdueTasks})</span>
                  )}
                </TableCell>
                <TableCell className="text-center"><span className="text-sm text-foreground">{m.activeProjects}</span></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${sc.color} ${sc.bg} border-0`}>{sc.label}</Badge>
                </TableCell>
                <TableCell><span className="text-xs text-muted-foreground">{formatDate(m.lastActive)}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(m); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(m); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TeamTable;
