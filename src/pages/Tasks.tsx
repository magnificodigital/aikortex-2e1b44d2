import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { CheckSquare, List, LayoutGrid, Calendar, User, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTasks, Task, TaskStatus } from "@/types/task";
import TaskFilters from "@/components/tasks/TaskFilters";
import TaskMetrics from "@/components/tasks/TaskMetrics";
import TaskListView from "@/components/tasks/TaskListView";
import TaskKanbanView from "@/components/tasks/TaskKanbanView";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";
import TaskMyView from "@/components/tasks/TaskMyView";
import TaskTeamView from "@/components/tasks/TaskTeamView";
import TaskDetailDialog from "@/components/tasks/TaskDetailDialog";
import NewTaskDialog from "@/components/tasks/NewTaskDialog";

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.description.toLowerCase().includes(search.toLowerCase()) &&
          !task.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== "all" && task.assignee !== assigneeFilter) return false;
      if (projectFilter !== "all") {
        if (projectFilter === "internal" && task.projectId !== "") return false;
        if (projectFilter !== "internal" && task.projectId !== projectFilter) return false;
      }
      return true;
    });
  }, [search, statusFilter, priorityFilter, assigneeFilter, projectFilter, tasks]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
            <p className="text-sm text-muted-foreground">Gestão de atividades da equipe</p>
          </div>
        </div>

        {/* Metrics */}
        <TaskMetrics tasks={tasks} />

        {/* Filters */}
        <TaskFilters
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter}
          assigneeFilter={assigneeFilter} onAssigneeChange={setAssigneeFilter}
          projectFilter={projectFilter} onProjectChange={setProjectFilter}
          onNewTask={() => setShowNewTask(true)}
          taskCount={filteredTasks.length}
        />

        {/* Views */}
        <Tabs defaultValue="kanban">
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="text-xs gap-1.5">
              <List className="w-3.5 h-3.5" /> Lista
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="my" className="text-xs gap-1.5">
              <User className="w-3.5 h-3.5" /> Minhas
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" /> Equipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <TaskListView tasks={filteredTasks} onTaskClick={setSelectedTask} />
          </TabsContent>
          <TabsContent value="kanban" className="mt-0">
            <TaskKanbanView tasks={filteredTasks} onTaskClick={setSelectedTask} onStatusChange={handleStatusChange} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-0">
            <TaskCalendarView tasks={filteredTasks} onTaskClick={setSelectedTask} />
          </TabsContent>
          <TabsContent value="my" className="mt-0">
            <TaskMyView tasks={filteredTasks} onTaskClick={setSelectedTask} />
          </TabsContent>
          <TabsContent value="team" className="mt-0">
            <TaskTeamView tasks={filteredTasks} onTaskClick={setSelectedTask} />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
        <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
