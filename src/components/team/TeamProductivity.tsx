import { TeamMember, departmentConfig, Department } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Clock, CheckSquare, Target, TrendingUp } from "lucide-react";

interface TeamProductivityProps {
  members: TeamMember[];
  onMemberClick: (member: TeamMember) => void;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(220 60% 55%)", "hsl(280 60% 55%)", "hsl(340 60% 55%)", "hsl(160 60% 45%)"];

const TeamProductivity = ({ members, onMemberClick }: TeamProductivityProps) => {
  const active = members.filter((m) => m.status === "active");

  const totalCompleted = active.reduce((s, m) => s + m.completedTasks, 0);
  const totalAssigned = active.reduce((s, m) => s + m.assignedTasks, 0);
  const totalHours = active.reduce((s, m) => s + m.totalHoursLogged, 0);
  const totalGoals = active.reduce((s, m) => s + m.goals.length, 0);
  const completedGoals = active.reduce((s, m) => s + m.goals.filter((g) => g.status === "completed").length, 0);

  // Dept breakdown
  const deptData = (Object.keys(departmentConfig) as Department[]).map((d) => {
    const deptMembers = active.filter((m) => m.department === d);
    if (deptMembers.length === 0) return null;
    return {
      name: departmentConfig[d].label,
      membros: deptMembers.length,
      tarefas: deptMembers.reduce((s, m) => s + m.assignedTasks, 0),
      concluídas: deptMembers.reduce((s, m) => s + m.completedTasks, 0),
      horas: Math.round(deptMembers.reduce((s, m) => s + m.totalHoursLogged, 0) / 60),
    };
  }).filter(Boolean);

  // Individual productivity
  const individualData = active
    .map((m) => ({
      name: m.fullName.split(" ")[0],
      completionRate: m.completedTasks + m.assignedTasks > 0 ? Math.round((m.completedTasks / (m.completedTasks + m.assignedTasks)) * 100) : 0,
      hours: Math.round(m.totalHoursLogged / 60),
      score: m.performance.score,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  // Goals by status
  const goalsData = [
    { name: "Concluídas", value: completedGoals },
    { name: "No Prazo", value: active.reduce((s, m) => s + m.goals.filter((g) => g.status === "on_track").length, 0) },
    { name: "Em Risco", value: active.reduce((s, m) => s + m.goals.filter((g) => g.status === "at_risk").length, 0) },
    { name: "Atrasadas", value: active.reduce((s, m) => s + m.goals.filter((g) => g.status === "overdue").length, 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-4 h-4 text-[hsl(var(--success))]" />
            <span className="text-xs text-muted-foreground">Tarefas Concluídas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{totalAssigned} ativas</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Horas Trabalhadas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{Math.round(totalHours / 60)}h</p>
          <p className="text-[10px] text-muted-foreground mt-1">~{Math.round(totalHours / 60 / active.length)}h/membro</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[hsl(var(--warning))]" />
            <span className="text-xs text-muted-foreground">Metas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{completedGoals}/{totalGoals}</p>
          <p className="text-[10px] text-muted-foreground mt-1">concluídas</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Taxa de Conclusão</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {totalCompleted + totalAssigned > 0 ? Math.round((totalCompleted / (totalCompleted + totalAssigned)) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">média geral</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Individual completion rates */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Taxa de Conclusão Individual</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={individualData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Conclusão"]} />
              <Bar dataKey="completionRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Goals distribution */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status das Metas</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={goalsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {goalsData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {goalsData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department breakdown */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Produtividade por Departamento</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={deptData}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="concluídas" name="Concluídas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tarefas" name="Ativas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="horas" name="Horas" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Member details */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Detalhamento Individual</h3>
        <div className="space-y-3">
          {active.sort((a, b) => b.completedTasks - a.completedTasks).map((m) => {
            const rate = m.completedTasks + m.assignedTasks > 0 ? Math.round((m.completedTasks / (m.completedTasks + m.assignedTasks)) * 100) : 0;
            const goalsCompleted = m.goals.filter((g) => g.status === "completed").length;
            return (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 cursor-pointer transition-colors" onClick={() => onMemberClick(m)}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate">{m.fullName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] border-0 bg-primary/10 text-primary">{m.completedTasks} feitas</Badge>
                      <Badge variant="outline" className="text-[9px] border-0 bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]">{rate}%</Badge>
                      {goalsCompleted > 0 && (
                        <Badge variant="outline" className="text-[9px] border-0 bg-[hsl(var(--warning)/.1)] text-[hsl(var(--warning))]">{goalsCompleted} metas</Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={rate} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamProductivity;
