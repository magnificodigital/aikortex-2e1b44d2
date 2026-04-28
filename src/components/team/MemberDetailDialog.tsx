import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamMember, roleConfig, statusConfig, departmentConfig } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, CheckSquare, Clock, AlertTriangle, Mail, Phone, Calendar, Star, Target, TrendingUp, TrendingDown, Minus, Wrench } from "lucide-react";

interface MemberDetailDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const trendIcon = (trend: "up" | "down" | "stable") => {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--success))]" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const goalStatusConfig = {
  on_track: { label: "No Prazo", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
  at_risk: { label: "Em Risco", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  completed: { label: "Concluída", color: "text-primary", bg: "bg-primary/10" },
  overdue: { label: "Atrasada", color: "text-destructive", bg: "bg-destructive/10" },
};

const MemberDetailDialog = ({ member, open, onOpenChange }: MemberDetailDialogProps) => {
  if (!member) return null;

  const rc = roleConfig[member.role];
  const sc = statusConfig[member.status];
  const dc = departmentConfig[member.department];
  const completionRate = member.completedTasks + member.assignedTasks > 0
    ? Math.round((member.completedTasks / (member.completedTasks + member.assignedTasks)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil do Colaborador</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 pb-4 border-b border-border/50">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
              {member.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{member.fullName}</h3>
            <p className="text-sm text-muted-foreground">{member.jobTitle}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${rc.color} ${rc.bg} border-0`}>{rc.label}</Badge>
              <Badge variant="outline" className={`text-[10px] ${dc.color} ${dc.bg} border-0`}>{dc.label}</Badge>
              <Badge variant="outline" className={`text-[10px] ${sc.color} ${sc.bg} border-0`}>{sc.label}</Badge>
              <div className="flex items-center gap-1">
                {trendIcon(member.performance.trend)}
                <span className="text-xs font-bold text-foreground">{member.performance.score}</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 text-xs">Geral</TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 text-xs">Desempenho</TabsTrigger>
            <TabsTrigger value="goals" className="flex-1 text-xs">Metas</TabsTrigger>
            <TabsTrigger value="feedback" className="flex-1 text-xs">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{member.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Desde {new Date(member.joinedAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            {/* Responsibilities */}
            {member.responsibilities.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Responsabilidades
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {member.responsibilities.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-border/50">{r}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {member.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Competências</h4>
                <div className="space-y-2">
                  {member.skills.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="text-foreground font-medium">{s.level}%</span>
                      </div>
                      <Progress value={s.level} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workload summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-lg p-3 text-center">
                <CheckSquare className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{member.assignedTasks}</p>
                <p className="text-[10px] text-muted-foreground">Ativas</p>
              </div>
              <div className="glass-card rounded-lg p-3 text-center">
                <Briefcase className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{member.activeProjects}</p>
                <p className="text-[10px] text-muted-foreground">Projetos</p>
              </div>
              <div className="glass-card rounded-lg p-3 text-center">
                <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{member.overdueTasks}</p>
                <p className="text-[10px] text-muted-foreground">Atrasadas</p>
              </div>
              <div className="glass-card rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-[hsl(var(--success))] mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{Math.round(member.totalHoursLogged / 60)}h</p>
                <p className="text-[10px] text-muted-foreground">Horas totais</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Taxa de conclusão</span>
                <span className="text-foreground font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Pontualidade</p>
                <p className="text-lg font-bold text-foreground">{member.performance.punctuality}%</p>
              </div>
              <div className="glass-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Qualidade</p>
                <p className="text-lg font-bold text-foreground">{member.performance.quality}%</p>
              </div>
              <div className="glass-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Colaboração</p>
                <p className="text-lg font-bold text-foreground">{member.performance.collaboration}%</p>
              </div>
              <div className="glass-card rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Iniciativa</p>
                <p className="text-lg font-bold text-foreground">{member.performance.initiative}%</p>
              </div>
            </div>
            {member.performance.monthlyScores.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Evolução Mensal</h4>
                <div className="flex items-end gap-1 h-20">
                  {member.performance.monthlyScores.map((ms) => (
                    <div key={ms.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(ms.score / 100) * 60}px` }}>
                        <div className="w-full bg-primary rounded-t h-full" />
                      </div>
                      <span className="text-[8px] text-muted-foreground">{ms.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="goals" className="space-y-3 mt-4">
            {member.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem metas definidas</p>
            ) : (
              member.goals.map((g) => {
                const gc = goalStatusConfig[g.status];
                return (
                  <div key={g.id} className="p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{g.title}</span>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${gc.color} ${gc.bg} border-0`}>{gc.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{g.description}</p>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="text-foreground font-medium">{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Prazo: {new Date(g.dueDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-3 mt-4">
            {member.feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem feedbacks recebidos</p>
            ) : (
              member.feedback.map((f) => (
                <div key={f.id} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{f.fromName}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] border-0 bg-primary/10 text-primary capitalize">{f.type === "praise" ? "Elogio" : f.type === "suggestion" ? "Sugestão" : "Avaliação"}</Badge>
                      {f.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= f.rating! ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(f.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailDialog;
