import { type TaskEngineItem, STATUS_CONFIG, STATUSES, getProjectTasks, type UnifiedStatus } from "@/types/task-engine";
import { Progress } from "@/components/ui/progress";
import { Users, ListTodo, Calendar } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Props {
  projects: TaskEngineItem[];
  allItems: TaskEngineItem[];
  onSelect: (p: TaskEngineItem) => void;
  onStatusChange?: (projectId: string, newStatus: UnifiedStatus) => void;
}

const KANBAN_STATUSES: UnifiedStatus[] = ["planned", "in_progress", "review", "completed", "blocked"];

const ProjectKanban = ({ projects, allItems, onSelect, onStatusChange }: Props) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as UnifiedStatus;
    if (onStatusChange) {
      onStatusChange(result.draggableId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {KANBAN_STATUSES.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const items = projects.filter((p) => p.status === status);
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[80px] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                  >
                    {items.map((p, index) => {
                      const tasks = getProjectTasks(allItems, p.id);
                      const done = tasks.filter((t) => t.status === "completed").length;
                      const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                      return (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <button
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onSelect(p)}
                              className={`w-full text-left rounded-lg border border-border bg-card p-3.5 transition-all space-y-2.5 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : "hover:shadow-md hover:border-primary/30"}`}
                            >
                              <p className="text-sm font-semibold text-foreground leading-tight">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.clientName}</p>
                              <Progress value={progress} className="h-1.5" />
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.team.length + 1}</span>
                                <span className="flex items-center gap-1"><ListTodo className="w-3 h-3" />{done}/{tasks.length}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                              </div>
                            </button>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Nenhum projeto</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default ProjectKanban;
