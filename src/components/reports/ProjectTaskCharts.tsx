import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { mockTaskEngine, getProjects, STATUS_CONFIG, STATUSES } from "@/types/task-engine";

const COLORS: Record<string, string> = {
  backlog: "hsl(215, 15%, 60%)",
  planned: "hsl(199, 89%, 48%)",
  in_progress: "hsl(217, 91%, 60%)",
  review: "hsl(38, 92%, 50%)",
  completed: "hsl(142, 71%, 45%)",
  blocked: "hsl(0, 72%, 51%)",
};

const ProjectTaskCharts = () => {
  const projects = getProjects(mockTaskEngine);
  const tasks = mockTaskEngine.filter(i => i.task_type === "task");

  const statusDistribution = STATUSES.map(s => ({
    name: STATUS_CONFIG[s].label,
    value: tasks.filter(t => t.status === s).length,
    fill: COLORS[s],
  })).filter(s => s.value > 0);

  const projectProgress = projects.map(p => ({
    name: p.title.length > 18 ? p.title.slice(0, 18) + "…" : p.title,
    progress: p.progress,
    tasks: mockTaskEngine.filter(t => t.projectId === p.id && t.task_type === "task").length,
  }));

  const productivityByMonth = [
    { month: "Out", criadas: 12, concluidas: 8 },
    { month: "Nov", criadas: 15, concluidas: 11 },
    { month: "Dez", criadas: 10, concluidas: 9 },
    { month: "Jan", criadas: 18, concluidas: 14 },
    { month: "Fev", criadas: 14, concluidas: 12 },
    { month: "Mar", criadas: 16, concluidas: 10 },
  ];

  const avgDuration = projects.filter(p => p.completedAt).length > 0
    ? Math.round(projects.filter(p => p.completedAt).reduce((s, p) => {
        const start = new Date(p.startDate).getTime();
        const end = new Date(p.completedAt!).getTime();
        return s + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / projects.filter(p => p.completedAt).length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Projetos", value: projects.length },
          { label: "Em Progresso", value: projects.filter(p => p.status === "in_progress").length },
          { label: "Taxa de Conclusão", value: `${Math.round((projects.filter(p => p.status === "completed").length / projects.length) * 100)}%` },
          { label: "Duração Média", value: `${avgDuration} dias` },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-bold text-foreground mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task status distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project progress */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Progresso dos Projetos</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgress} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" width={120} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="progress" name="Progresso" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productivity over time */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Produtividade (Tarefas Criadas vs Concluídas)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="criadas" name="Criadas" fill="hsl(215, 15%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="concluidas" name="Concluídas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTaskCharts;
