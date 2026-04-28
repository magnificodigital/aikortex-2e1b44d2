interface ProjectRowProps {
  name: string;
  client: string;
  status: "active" | "completed" | "paused";
  progress: number;
  dueDate: string;
}

const statusStyles = {
  active: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
};

const statusLabels = {
  active: "Ativo",
  completed: "Concluído",
  paused: "Pausado",
};

const ProjectRow = ({ name, client, status, progress, dueDate }: ProjectRowProps) => {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors rounded-md">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{client}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
      <div className="w-24 hidden sm:block">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground w-20 text-right hidden md:block">{dueDate}</span>
    </div>
  );
};

export default ProjectRow;
