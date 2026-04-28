import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task, priorityConfig, statusConfig, teamMembers } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MessageSquare, CheckSquare, Plus, Send, Tag, User, Briefcase, Timer, Repeat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailDialog = ({ task, open, onOpenChange }: TaskDetailDialogProps) => {
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  if (!task) return null;

  const pc = priorityConfig[task.priority];
  const sc = statusConfig[task.status];
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalTime = task.timeEntries.reduce((sum, te) => sum + te.duration, 0);
  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "done";

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    toast.success("Comentário adicionado!");
    setNewComment("");
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    toast.success("Subtarefa adicionada!");
    setNewSubtask("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] ${pc.color} ${pc.bg} border-0`}>{pc.label}</Badge>
                <Badge variant="outline" className={`text-[10px] ${sc.color} ${sc.bg} border-0`}>{sc.label}</Badge>
                {task.recurring && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-0 bg-accent">
                    <Repeat className="w-3 h-3" /> {task.recurring === "weekly" ? "Semanal" : task.recurring === "monthly" ? "Mensal" : "Diária"}
                  </Badge>
                )}
                {isOverdue && <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>}
              </div>
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex">
          {/* Main content */}
          <div className="flex-1 border-r border-border/50">
            <Tabs defaultValue="subtasks" className="h-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-6 h-10">
                <TabsTrigger value="subtasks" className="text-xs gap-1 data-[state=active]:shadow-none">
                  <CheckSquare className="w-3 h-3" /> Subtarefas
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs gap-1 data-[state=active]:shadow-none">
                  <MessageSquare className="w-3 h-3" /> Comentários ({task.comments.length})
                </TabsTrigger>
                <TabsTrigger value="time" className="text-xs gap-1 data-[state=active]:shadow-none">
                  <Timer className="w-3 h-3" /> Tempo
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px]">
                <TabsContent value="subtasks" className="px-6 py-4 mt-0 space-y-3">
                  {task.subtasks.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{completedSubtasks}/{task.subtasks.length}</span>
                    </div>
                  )}
                  {task.subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-3 py-1.5">
                      <Checkbox checked={sub.completed} />
                      <span className={`text-sm ${sub.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {sub.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      placeholder="Adicionar subtarefa..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    />
                    <Button size="sm" variant="ghost" onClick={handleAddSubtask} className="h-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="px-6 py-4 mt-0 space-y-4">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {comment.author.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{comment.author}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {task.comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                  )}
                  <div className="flex items-end gap-2 pt-2 border-t border-border/50">
                    <Textarea
                      placeholder="Escreva um comentário... Use @ para mencionar."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[60px] text-sm"
                    />
                    <Button size="sm" onClick={handleAddComment} className="h-8 shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="time" className="px-6 py-4 mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo total registrado</p>
                      <p className="text-2xl font-bold text-foreground">{Math.floor(totalTime / 60)}h {totalTime % 60}m</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Estimado</p>
                      <p className="text-lg font-semibold text-foreground">{task.estimatedEffort}h</p>
                    </div>
                  </div>
                  {totalTime > 0 && task.estimatedEffort > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Progresso</span>
                        <span className="text-[10px] text-muted-foreground">{Math.round((totalTime / 60 / task.estimatedEffort) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min((totalTime / 60 / task.estimatedEffort) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    variant={isTracking ? "destructive" : "outline"}
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setIsTracking(!isTracking);
                      toast.success(isTracking ? "Timer parado!" : "Timer iniciado!");
                    }}
                  >
                    <Clock className="w-4 h-4" />
                    {isTracking ? "Parar Timer" : "Iniciar Timer"}
                  </Button>
                  <div className="space-y-2">
                    {task.timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-border/20">
                        <div>
                          <p className="text-xs font-medium text-foreground">{entry.user}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.description || "Sem descrição"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-foreground">{Math.floor(entry.duration / 60)}h {entry.duration % 60}m</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(entry.date), "dd MMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="w-56 p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" /> Responsável
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {task.assignee.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground">{task.assignee}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Projeto
              </p>
              <span className="text-xs text-foreground">{task.projectName}</span>
              <p className="text-[10px] text-muted-foreground">{task.clientName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Datas
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Início</span>
                  <span className="text-xs text-foreground">{format(new Date(task.startDate), "dd/MM/yy")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Prazo</span>
                  <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-foreground"}`}>
                    {format(new Date(task.dueDate), "dd/MM/yy")}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Esforço
              </p>
              <span className="text-xs text-foreground">{task.estimatedEffort}h estimadas</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
