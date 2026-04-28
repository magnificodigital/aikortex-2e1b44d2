import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { mockContracts, contractTypeConfig } from "@/types/contract";

const typeColors: Record<string, string> = {
  monthly_service: "hsl(217, 91%, 60%)",
  saas_subscription: "hsl(142, 71%, 45%)",
  implementation: "hsl(38, 92%, 50%)",
  consulting: "hsl(199, 89%, 48%)",
  custom: "hsl(215, 15%, 45%)",
};

const ContractCharts = () => {
  const activeContracts = mockContracts.filter(c => c.status === "active");

  // By type
  const byType = activeContracts.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(byType).map(([type, count]) => ({
    name: contractTypeConfig[type as keyof typeof contractTypeConfig]?.label || type,
    value: count,
    type,
  }));

  // Revenue by client
  const byClient = activeContracts.map(c => ({
    client: c.client.length > 12 ? c.client.substring(0, 12) + "…" : c.client,
    value: c.frequency === "monthly" ? c.value : c.frequency === "quarterly" ? c.value / 3 : c.frequency === "yearly" ? c.value / 12 : c.value,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Contratos por Tipo</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Ativos</p>
        <div className="h-52 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2} stroke="hsl(220, 16%, 96%)">
                {pieData.map(d => <Cell key={d.name} fill={typeColors[d.type] || "hsl(215,15%,45%)"} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors[d.type] }} />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">MRR por Cliente</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Valor mensal equivalente</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byClient} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(215, 15%, 45%)" }} />
              <YAxis type="category" dataKey="client" tick={{ fontSize: 10, fill: "hsl(215, 15%, 45%)" }} width={85} />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ContractCharts;
