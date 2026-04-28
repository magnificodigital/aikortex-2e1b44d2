import { Task, TaskStatus, statusConfig, priorityConfig } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, CheckSquare, Repeat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface TaskKanbanViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

const columns: TaskStatus[] = ["todo", "in_progress", "review", "done"];

const TaskKanbanView = ({ tasks, onTaskClick, onStatusChange }: TaskKanbanViewProps) => {
  const tasksByStatus = columns.reduce<Record<TaskStatus, Task[]>>((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TaskStatus;
    const taskId = result.draggableId;
    if (onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-280px)]">
        {columns.map((status) => {
          const sc = statusConfig[status];
          const columnTasks = tasksByStatus[status];

          return (
            <div key={status} className={`flex flex-col rounded-xl p-2 ${
                status === "todo" ? "bg-muted" :
                status === "in_progress" ? "bg-info/10" :
                status === "review" ? "bg-warning/10" :
                "bg-success/10"
              }`}>
              <div className="flex items-center justify-between mb-3 px-1 py-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    status === "todo" ? "bg-muted-foreground" :
                    status === "in_progress" ? "bg-info" :
                    status === "review" ? "bg-warning" :
                    "bg-success"
                  }`} />
                  <span className={`text-xs font-semibold ${
                    status === "todo" ? "text-muted-foreground" :
                    status === "in_progress" ? "text-info" :
                    status === "review" ? "text-warning" :
                    "text-success"
                  }`}>{sc.label}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5">{columnTasks.length}</Badge>
              </div>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <ScrollArea className="flex-1">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 pr-2 min-h-[100px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                    >
                      {columnTasks.map((task, index) => {
                        const pc = priorityConfig[task.priority];
                        const completedSubs = task.subtasks.filter((s) => s.completed).length;
                        const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "done";

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onTaskClick(task)}
                                className={`glass-card rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all group ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : "hover:shadow-md hover:-translate-y-0.5"}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="outline" className={`text-[9px] ${pc.color} ${pc.bg} border-0`}>
                                    {pc.label}
                                  </Badge>
                                  {task.recurring && <Repeat className="w-3 h-3 text-muted-foreground" />}
                                </div>
                                <p className="text-xs font-medium text-foreground mb-1 line-clamp-2">{task.title}</p>
                                <p className="text-[10px] text-muted-foreground mb-2">{task.clientName} • {task.projectName}</p>

                                {task.subtasks.length > 0 && (
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <CheckSquare className="w-3 h-3 text-muted-foreground" />
                                    <div className="flex-1 h-1 bg-accent rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${(completedSubs / task.subtasks.length) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[9px] text-muted-foreground">{completedSubs}/{task.subtasks.length}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                                  <div className="flex items-center gap-1">
                                    <Calendar className={`w-3 h-3 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
                                    <span className={`text-[10px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                      {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {task.comments.length > 0 && (
                                      <div className="flex items-center gap-0.5">
                                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[9px] text-muted-foreground">{task.comments.length}</span>
                                      </div>
                                    )}
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                        {task.assignee.split(" ").map((n) => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default TaskKanbanView;
