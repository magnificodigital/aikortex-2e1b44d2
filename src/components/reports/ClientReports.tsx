import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MOCK_CLIENTS } from "@/types/client";

const COLORS = [
  "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)", "hsl(0, 72%, 51%)", "hsl(270, 70%, 55%)",
];

const ClientReports = () => {
  const clients = MOCK_CLIENTS;
  const statusData = [
    { name: "Ativo", value: clients.filter(c => c.status === "active").length },
    { name: "Onboarding", value: clients.filter(c => c.status === "onboarding").length },
    { name: "Inativo", value: clients.filter(c => c.status === "inactive").length },
  ].filter(s => s.value > 0);

  const revenuePerClient = clients
    .map(c => ({
      name: c.companyName.length > 12 ? c.companyName.slice(0, 12) + "…" : c.companyName,
      receita: parseInt(c.revenue.replace(/[^\d]/g, "")) || 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  const projectsPerClient = clients
    .filter(c => c.projects > 0)
    .map(c => ({ name: c.companyName.length > 12 ? c.companyName.slice(0, 12) + "…" : c.companyName, projetos: c.projects }))
    .sort((a, b) => b.projetos - a.projetos);

  const growthData = [
    { month: "Set", clientes: 4 }, { month: "Out", clientes: 5 }, { month: "Nov", clientes: 5 },
    { month: "Dez", clientes: 6 }, { month: "Jan", clientes: 7 }, { month: "Fev", clientes: 7 },
    { month: "Mar", clientes: 8 },
  ];

  const avgHealth = Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Clientes", value: clients.length },
          { label: "Ativos", value: clients.filter(c => c.status === "active").length },
          { label: "Health Score Médio", value: `${avgHealth}%` },
          { label: "Novos (este mês)", value: clients.filter(c => c.status === "onboarding").length },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-bold text-foreground mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status dos Clientes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Crescimento de Clientes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <Tooltip />
                <Bar dataKey="clientes" name="Clientes" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Cliente</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenuePerClient} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" tickFormatter={v => `${v / 1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" width={80} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                <Bar dataKey="receita" name="Receita" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Projetos por Cliente</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsPerClient} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" width={80} />
                <Tooltip />
                <Bar dataKey="projetos" name="Projetos" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientReports;
