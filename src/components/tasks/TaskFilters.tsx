import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { teamMembers } from "@/types/task";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  priorityFilter: string;
  onPriorityChange: (val: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (val: string) => void;
  projectFilter: string;
  onProjectChange: (val: string) => void;
  onNewTask: () => void;
  taskCount: number;
}

const projects = [
  { id: "1", name: "Automação de Vendas" },
  { id: "2", name: "Website Institucional" },
  { id: "3", name: "Agente de Voz IA" },
];

const TaskFilters = ({
  search, onSearchChange, statusFilter, onStatusChange,
  priorityFilter, onPriorityChange, assigneeFilter, onAssigneeChange,
  projectFilter, onProjectChange, onNewTask, taskCount,
}: TaskFiltersProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Badge variant="secondary" className="text-xs">{taskCount} tarefas</Badge>
      </div>
      <Button onClick={onNewTask} size="sm" className="gap-2">
        <Plus className="w-4 h-4" />
        Nova Tarefa
      </Button>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Status</SelectItem>
          <SelectItem value="todo">A Fazer</SelectItem>
          <SelectItem value="in_progress">Em Progresso</SelectItem>
          <SelectItem value="review">Revisão</SelectItem>
          <SelectItem value="done">Concluída</SelectItem>
        </SelectContent>
      </Select>
      <Select value={priorityFilter} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </SelectContent>
      </Select>
      <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {teamMembers.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={projectFilter} onValueChange={onProjectChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Projeto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Projetos</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
          <SelectItem value="internal">Interno</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default TaskFilters;
