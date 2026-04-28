import { Task, priorityConfig, statusConfig } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const TaskCalendarView = ({ tasks, onTaskClick }: TaskCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 2, 1)); // March 2025

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(new Date(2025, 2, 1))}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border/50 rounded-xl overflow-hidden">
        {weekDays.map((day) => (
          <div key={day} className="bg-accent/50 p-2 text-center">
            <span className="text-[10px] font-semibold text-muted-foreground">{day}</span>
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-background/50 min-h-[100px] p-1" />
        ))}
        {days.map((day) => {
          const dayTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate), day));
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`bg-background min-h-[100px] p-1 ${isToday ? "ring-2 ring-primary/30 ring-inset" : ""}`}>
              <span className={`text-[10px] font-medium block mb-1 px-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const pc = priorityConfig[task.priority];
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`${pc.bg} rounded px-1 py-0.5 cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      <p className={`text-[9px] font-medium ${pc.color} truncate`}>{task.title}</p>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskCalendarView;
