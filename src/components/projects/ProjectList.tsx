import { type TaskEngineItem, STATUS_CONFIG, PRIORITY_CONFIG, getProjectTasks } from "@/types/task-engine";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  projects: TaskEngineItem[];
  allItems: TaskEngineItem[];
  onSelect: (p: TaskEngineItem) => void;
}

const ProjectList = ({ projects, allItems, onSelect }: Props) => (
  <div className="rounded-lg border border-border bg-card overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Projeto</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead>Progresso</TableHead>
          <TableHead>Horas</TableHead>
          <TableHead className="text-right">Prazo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((p) => {
          const tasks = getProjectTasks(allItems, p.id);
          const done = tasks.filter((t) => t.status === "completed").length;
          const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
          const sc = STATUS_CONFIG[p.status];
          const pc = PRIORITY_CONFIG[p.priority];
          return (
            <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelect(p)}>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{tasks.length} tarefas</p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.clientName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.owner}</TableCell>
              <TableCell>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
              </TableCell>
              <TableCell>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${pc.bg} ${pc.color}`}>{pc.label}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 w-28">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.estimatedHours}h</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {new Date(p.dueDate).toLocaleDateString("pt-BR")}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default ProjectList;
