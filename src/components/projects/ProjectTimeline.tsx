import { type TaskEngineItem, STATUS_CONFIG, getProjectTasks } from "@/types/task-engine";

interface Props {
  projects: TaskEngineItem[];
  allItems: TaskEngineItem[];
  onSelect: (p: TaskEngineItem) => void;
}

const barColors: Record<string, string> = {
  backlog: "bg-muted-foreground",
  planned: "bg-[hsl(var(--info))]",
  in_progress: "bg-primary",
  review: "bg-[hsl(var(--warning))]",
  completed: "bg-[hsl(var(--success))]",
  blocked: "bg-destructive",
};

const ProjectTimeline = ({ projects, allItems, onSelect }: Props) => {
  const sorted = [...projects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const allDates = sorted.flatMap((p) => [new Date(p.startDate).getTime(), new Date(p.dueDate).getTime()]);
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const range = maxDate - minDate || 1;

  const months: string[] = [];
  const d = new Date(minDate);
  while (d.getTime() <= maxDate) {
    months.push(d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }));
    d.setMonth(d.getMonth() + 1);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center mb-4 ml-48">
        {months.map((m, i) => (
          <div key={i} className="text-[10px] text-muted-foreground font-medium uppercase" style={{ width: `${100 / months.length}%` }}>{m}</div>
        ))}
      </div>
      {sorted.map((p) => {
        const tasks = getProjectTasks(allItems, p.id);
        const done = tasks.filter((t) => t.status === "completed").length;
        const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
        const start = ((new Date(p.startDate).getTime() - minDate) / range) * 100;
        const width = Math.max(((new Date(p.dueDate).getTime() - new Date(p.startDate).getTime()) / range) * 100, 3);

        return (
          <button key={p.id} onClick={() => onSelect(p)} className="flex items-center w-full group hover:bg-accent/30 rounded-md py-1.5 px-1 transition-colors">
            <div className="w-48 shrink-0 pr-3">
              <p className="text-xs font-medium text-foreground truncate text-left">{p.title}</p>
              <p className="text-[10px] text-muted-foreground truncate text-left">{p.clientName}</p>
            </div>
            <div className="flex-1 relative h-6">
              <div
                className={`absolute top-1 h-4 rounded-full ${barColors[p.status] || "bg-muted"} opacity-80 group-hover:opacity-100 transition-opacity`}
                style={{ left: `${start}%`, width: `${width}%` }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-primary-foreground font-medium">{progress}%</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ProjectTimeline;
