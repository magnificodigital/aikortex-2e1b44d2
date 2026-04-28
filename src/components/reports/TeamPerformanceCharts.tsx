import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { mockTeamMembers } from "@/types/team";

const TeamPerformanceCharts = () => {
  const active = mockTeamMembers.filter(m => m.status === "active");

  const workloadData = active.map(m => ({
    name: m.fullName.split(" ")[0],
    atribuídas: m.assignedTasks,
    concluídas: m.completedTasks > 50 ? Math.round(m.completedTasks / 10) : m.completedTasks,
    atrasadas: m.overdueTasks,
  }));

  const radarData = active.slice(0, 6).map(m => ({
    member: m.fullName.split(" ")[0],
    tarefas: Math.min(m.assignedTasks * 8, 100),
    projetos: Math.min(m.activeProjects * 15, 100),
    horas: Math.min(Math.round(m.totalHoursLogged / 20), 100),
    conclusão: m.assignedTasks > 0 ? Math.round((m.completedTasks / (m.completedTasks + m.assignedTasks)) * 100) : 0,
  }));

  const totalTasks = active.reduce((s, m) => s + m.assignedTasks, 0);
  const totalCompleted = active.reduce((s, m) => s + m.completedTasks, 0);
  const totalOverdue = active.reduce((s, m) => s + m.overdueTasks, 0);
  const totalHours = active.reduce((s, m) => s + m.totalHoursLogged, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Membros Ativos", value: active.length },
          { label: "Tarefas Atribuídas", value: totalTasks },
          { label: "Total Concluídas", value: totalCompleted },
          { label: "Horas Registradas", value: `${Math.round(totalHours / 60)}h` },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-bold text-foreground mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workload distribution */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Carga de Trabalho por Membro</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="atribuídas" name="Atribuídas" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="atrasadas" name="Atrasadas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team member table */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Performance Individual</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium text-xs">Membro</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Tarefas</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Concluídas</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Atrasadas</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Projetos</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Horas</th>
                </tr>
              </thead>
              <tbody>
                {active.map(m => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground font-medium">{m.fullName}</td>
                    <td className="text-center py-2.5">{m.assignedTasks}</td>
                    <td className="text-center py-2.5 text-[hsl(var(--success))]">{m.completedTasks}</td>
                    <td className="text-center py-2.5">{m.overdueTasks > 0 ? <span className="text-destructive">{m.overdueTasks}</span> : "0"}</td>
                    <td className="text-center py-2.5">{m.activeProjects}</td>
                    <td className="text-center py-2.5">{Math.round(m.totalHoursLogged / 60)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformanceCharts;
