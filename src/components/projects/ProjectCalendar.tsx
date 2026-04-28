import { type TaskEngineItem, STATUS_CONFIG, getProjectTasks } from "@/types/task-engine";
import { Calendar as CalendarIcon } from "lucide-react";

interface Props {
  projects: TaskEngineItem[];
  allItems: TaskEngineItem[];
  onSelect: (p: TaskEngineItem) => void;
}

const borderColors: Record<string, string> = {
  backlog: "border-l-muted-foreground",
  planned: "border-l-[hsl(var(--info))]",
  in_progress: "border-l-primary",
  review: "border-l-[hsl(var(--warning))]",
  completed: "border-l-[hsl(var(--success))]",
  blocked: "border-l-destructive",
};

const ProjectCalendar = ({ projects, allItems, onSelect }: Props) => {
  const sorted = [...projects].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const grouped = sorted.reduce<Record<string, TaskEngineItem[]>>((acc, p) => {
    const month = new Date(p.dueDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    (acc[month] = acc[month] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <h3 className="text-sm font-semibold text-foreground capitalize mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />{month}
          </h3>
          <div className="space-y-2">
            {items.map((p) => {
              const tasks = getProjectTasks(allItems, p.id);
              const done = tasks.filter((t) => t.status === "completed").length;
              const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className={`w-full text-left rounded-lg border border-border bg-card p-3 hover:shadow-md transition-all hover:border-primary/30 border-l-4 ${borderColors[p.status] || ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.clientName} · {p.owner}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(p.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-xs text-muted-foreground">{progress}% · {done}/{tasks.length}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectCalendar;
