import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { type UnifiedStatus, STATUS_CONFIG, STATUSES } from "@/types/task-engine";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: UnifiedStatus | "all";
  onStatusChange: (val: UnifiedStatus | "all") => void;
  onNewProject?: () => void;
}

const ProjectFilters = ({ search, onSearchChange, statusFilter, onStatusChange, onNewProject }: Props) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
    <div className="relative flex-1 w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input placeholder="Buscar projetos..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9 h-9 bg-card border-border" />
    </div>
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onStatusChange("all")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
      >
        Todos
      </button>
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onStatusChange(s)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          {STATUS_CONFIG[s].label}
        </button>
      ))}
    </div>
    <Button size="sm" className="ml-auto gap-1.5" onClick={onNewProject}>
      <Plus className="w-4 h-4" /> Novo Projeto
    </Button>
  </div>
);

export default ProjectFilters;
