import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type TaskEngineItem,
  type UnifiedStatus,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  STATUSES,
  TEAM_MEMBERS,
  getProjectTasks,
  getSubtasks,
} from "@/types/task-engine";
import {
  CheckSquare, Users, Calendar, BarChart3, Clock, AlertTriangle, CheckCircle2,
  Plus, ChevronDown, ChevronRight, MessageCircle, Paperclip, Zap, Trash2, Send,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  project: TaskEngineItem | null;
  allItems: TaskEngineItem[];
  open: boolean;
  onClose: () => void;
  onUpdateItem: (item: TaskEngineItem) => void;
  onAddItem: (item: TaskEngineItem) => void;
  onDeleteItem: (id: string) => void;
}

const ProjectDetailDialog = ({ project, allItems, open, onClose, onUpdateItem, onAddItem, onDeleteItem }: Props) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState("");
  const [commentTarget, setCommentTarget] = useState<string | null>(null);

  if (!project) return null;

  const tasks = getProjectTasks(allItems, project.id);
  const doneTasks = tasks.filter((t) => t.status === "completed").length;
  const overdueTasks = tasks.filter((t) => t.status !== "completed" && new Date(t.dueDate) < new Date()).length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const totalHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
  const loggedMinutes = tasks.reduce((s, t) => s + t.timeEntries.reduce((a, e) => a + e.duration, 0), 0);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedTasks);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedTasks(next);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: TaskEngineItem = {
      id: `task-${Date.now()}`, task_type: "task", title: newTaskTitle, description: "",
      parentId: project.id, projectId: project.id, owner: project.owner, assignee: "", team: [],
      clientId: project.clientId, clientName: project.clientName,
      startDate: new Date().toISOString().split("T")[0], dueDate: project.dueDate, createdAt: new Date().toISOString(),
      status: "backlog", priority: "medium", progress: 0, tags: [], estimatedHours: 0,
      comments: [], timeEntries: [], attachments: [], automations: [],
    };
    onAddItem(task);
    setNewTaskTitle("");
    toast.success("Tarefa adicionada!");
  };

  const handleAddSubtask = (taskId: string) => {
    const title = newSubtaskTitles[taskId]?.trim();
    if (!title) return;
    const parentTask = allItems.find((i) => i.id === taskId)!;
    const sub: TaskEngineItem = {
      id: `sub-${Date.now()}`, task_type: "subtask", title, description: "",
      parentId: taskId, projectId: project.id, owner: parentTask.assignee, assignee: parentTask.assignee, team: [],
      clientId: project.clientId, clientName: project.clientName,
      startDate: new Date().toISOString().split("T")[0], dueDate: parentTask.dueDate, createdAt: new Date().toISOString(),
      status: "backlog", priority: "medium", progress: 0, tags: [], estimatedHours: 0,
      comments: [], timeEntries: [], attachments: [], automations: [],
    };
    onAddItem(sub);
    setNewSubtaskTitles({ ...newSubtaskTitles, [taskId]: "" });
  };

  const handleStatusChange = (item: TaskEngineItem, status: UnifiedStatus) => {
    onUpdateItem({ ...item, status, ...(status === "completed" ? { completedAt: new Date().toISOString(), progress: 100 } : { completedAt: undefined }) });
  };

  const handleAddComment = (itemId: string) => {
    if (!newComment.trim()) return;
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;
    const comment = { id: `cm-${Date.now()}`, author: project.owner, content: newComment, createdAt: new Date().toISOString() };
    onUpdateItem({ ...item, comments: [...item.comments, comment] });
    setNewComment("");
    setCommentTarget(null);
    toast.success("Comentário adicionado!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-lg">{project.title}</DialogTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[project.status].bg} ${STATUS_CONFIG[project.status].color}`}>
              {STATUS_CONFIG[project.status].label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[project.priority].bg} ${PRIORITY_CONFIG[project.priority].color}`}>
              {PRIORITY_CONFIG[project.priority].label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{project.clientName} · {project.owner} · {project.template || "Personalizado"}</p>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-2">
          {[
            { icon: BarChart3, color: "text-primary", value: `${progress}%`, label: "Progresso" },
            { icon: CheckCircle2, color: "text-[hsl(var(--success))]", value: `${doneTasks}/${tasks.length}`, label: "Concluídas" },
            { icon: AlertTriangle, color: "text-[hsl(var(--warning))]", value: overdueTasks, label: "Atrasadas" },
            { icon: Clock, color: "text-muted-foreground", value: `${Math.round(loggedMinutes / 60)}/${totalHours}h`, label: "Horas" },
            { icon: Users, color: "text-[hsl(var(--info))]", value: project.team.length + 1, label: "Membros" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-muted/50 p-3 text-center">
              <m.icon className={`w-4 h-4 mx-auto ${m.color} mb-1`} />
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        <Progress value={progress} className="h-2" />

        <Tabs defaultValue="tasks" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="team">Equipe</TabsTrigger>
            <TabsTrigger value="automations">Automações</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>

          {/* TASKS TAB */}
          <TabsContent value="tasks" className="space-y-3 mt-3">
            {/* Add task */}
            <div className="flex gap-2">
              <Input placeholder="Nova tarefa..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTask()} className="flex-1" />
              <Button size="sm" onClick={handleAddTask}><Plus className="w-4 h-4" /></Button>
            </div>

            {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa ainda. Adicione acima.</p>}

            {tasks.map((task) => {
              const subtasks = getSubtasks(allItems, task.id);
              const isExpanded = expandedTasks.has(task.id);
              const sc = STATUS_CONFIG[task.status];
              const pc = PRIORITY_CONFIG[task.priority];

              return (
                <div key={task.id} className="rounded-lg border border-border bg-card">
                  {/* Task header */}
                  <div className="flex items-center gap-2 p-3">
                    <button onClick={() => toggleExpand(task.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <CheckSquare className={`w-4 h-4 shrink-0 ${task.status === "completed" ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{task.assignee || "Sem responsável"}</span>
                        <span>·</span>
                        <span>{new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                        {subtasks.length > 0 && <><span>·</span><span>{subtasks.filter((s) => s.status === "completed").length}/{subtasks.length} subtarefas</span></>}
                        {task.comments.length > 0 && <><span>·</span><span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{task.comments.length}</span></>}
                      </div>
                    </div>
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v as UnifiedStatus)}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pc.bg} ${pc.color} hidden sm:inline`}>{pc.label}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { onDeleteItem(task.id); toast.success("Tarefa removida"); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
                      {/* Subtasks */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Subtarefas</p>
                        {subtasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2 pl-4 py-1">
                            <button
                              onClick={() => handleStatusChange(sub, sub.status === "completed" ? "backlog" : "completed")}
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sub.status === "completed" ? "bg-primary border-primary" : "border-border hover:border-primary"}`}
                            >
                              {sub.status === "completed" && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                            </button>
                            <span className={`text-xs flex-1 ${sub.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.title}</span>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onDeleteItem(sub.id)}><Trash2 className="w-2.5 h-2.5" /></Button>
                          </div>
                        ))}
                        <div className="flex gap-2 pl-4 mt-1">
                          <Input
                            placeholder="Nova subtarefa..."
                            value={newSubtaskTitles[task.id] || ""}
                            onChange={(e) => setNewSubtaskTitles({ ...newSubtaskTitles, [task.id]: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && handleAddSubtask(task.id)}
                            className="h-7 text-xs flex-1"
                          />
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleAddSubtask(task.id)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </div>

                      {/* Assignee */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Responsável:</span>
                        <Select value={task.assignee} onValueChange={(v) => onUpdateItem({ ...task, assignee: v })}>
                          <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>{TEAM_MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>

                      {/* Comments */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Comentários ({task.comments.length})</p>
                        {task.comments.map((c) => (
                          <div key={c.id} className="pl-4 border-l-2 border-primary/20">
                            <p className="text-xs"><span className="font-medium text-foreground">{c.author}</span> <span className="text-muted-foreground">· {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.content}</p>
                          </div>
                        ))}
                        {commentTarget === task.id ? (
                          <div className="flex gap-2">
                            <Input placeholder="Escrever comentário..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment(task.id)} className="h-7 text-xs flex-1" />
                            <Button size="sm" variant="outline" className="h-7" onClick={() => handleAddComment(task.id)}><Send className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setCommentTarget(task.id)}>
                            <MessageCircle className="w-3 h-3 mr-1" />Comentar
                          </Button>
                        )}
                      </div>

                      {/* Time entries */}
                      {task.timeEntries.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Tempo registrado</p>
                          {task.timeEntries.map((te) => (
                            <p key={te.id} className="text-xs text-muted-foreground pl-4">
                              {te.user} · {Math.round(te.duration / 60)}h · {new Date(te.date).toLocaleDateString("pt-BR")}
                              {te.description && ` · ${te.description}`}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* TEAM TAB */}
          <TabsContent value="team" className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                {project.owner.split(" ").map((n) => n[0]).join("")}
              </div>
              <div><p className="text-sm font-medium text-foreground">{project.owner}</p><p className="text-[11px] text-muted-foreground">Owner · Gerente de Projeto</p></div>
            </div>
            {project.team.map((member) => {
              const memberTasks = tasks.filter((t) => t.assignee === member);
              const memberDone = memberTasks.filter((t) => t.status === "completed").length;
              return (
                <div key={member} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {member.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{member}</p>
                    <p className="text-[11px] text-muted-foreground">{memberDone}/{memberTasks.length} tarefas concluídas</p>
                  </div>
                  <Progress value={memberTasks.length ? (memberDone / memberTasks.length) * 100 : 0} className="h-1.5 w-20" />
                </div>
              );
            })}
          </TabsContent>

          {/* AUTOMATIONS TAB */}
          <TabsContent value="automations" className="mt-3 space-y-3">
            {project.automations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma automação configurada.</p>}
            {project.automations.map((auto) => (
              <div key={auto.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <Zap className={`w-4 h-4 ${auto.enabled ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{auto.action}</p>
                  <p className="text-[11px] text-muted-foreground">Trigger: {auto.event.replace(/_/g, " ")}</p>
                </div>
                <Badge variant={auto.enabled ? "default" : "outline"} className="text-xs">{auto.enabled ? "Ativo" : "Inativo"}</Badge>
              </div>
            ))}
          </TabsContent>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="mt-3 space-y-3">
            <div className="rounded-md border border-border bg-card p-4 space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Descrição</p>
                <p className="text-sm text-foreground mt-1">{project.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Início</p>
                  <p className="text-sm text-foreground mt-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(project.startDate).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Prazo</p>
                  <p className="text-sm text-foreground mt-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(project.dueDate).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {project.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </div>
              </div>
              {project.template && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Template</p>
                  <p className="text-sm text-foreground mt-1">{project.template}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailDialog;
