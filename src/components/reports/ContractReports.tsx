import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { mockContracts, contractStatusConfig } from "@/types/contract";

const COLORS = [
  "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(215, 15%, 60%)",
];

const ContractReports = () => {
  const contracts = mockContracts;
  const active = contracts.filter(c => c.status === "active");
  const totalValue = active.reduce((s, c) => s + c.value, 0);
  const expiringSoon = contracts.filter(c => {
    if (c.status !== "active") return false;
    const end = new Date(c.endDate);
    const now = new Date();
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  });

  const statusData = Object.entries(
    contracts.reduce((acc, c) => {
      const label = contractStatusConfig[c.status]?.label || c.status;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const valueByType = [
    { type: "Serviço Mensal", value: contracts.filter(c => c.type === "monthly_service").reduce((s, c) => s + c.value, 0) },
    { type: "Implementação", value: contracts.filter(c => c.type === "implementation").reduce((s, c) => s + c.value, 0) },
    { type: "Consultoria", value: contracts.filter(c => c.type === "consulting").reduce((s, c) => s + c.value, 0) },
    { type: "SaaS", value: contracts.filter(c => c.type === "saas_subscription").reduce((s, c) => s + c.value, 0) },
  ].filter(v => v.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Contratos", value: contracts.length },
          { label: "Ativos", value: active.length },
          { label: "Valor Total Ativo", value: `R$ ${(totalValue / 1000).toFixed(0)}k` },
          { label: "Expirando em 90 dias", value: expiringSoon.length },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-xl p-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-bold text-foreground mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status dos Contratos</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Valor por Tipo de Contrato</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" tickFormatter={v => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                <Bar dataKey="value" name="Valor" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contracts table */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Contratos Ativos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium text-xs">Contrato</th>
                  <th className="text-left py-2 text-muted-foreground font-medium text-xs">Cliente</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Valor</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Vencimento</th>
                  <th className="text-center py-2 text-muted-foreground font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {active.map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground font-medium">{c.name}</td>
                    <td className="py-2.5 text-muted-foreground">{c.client}</td>
                    <td className="text-center py-2.5">R$ {c.value.toLocaleString()}</td>
                    <td className="text-center py-2.5 text-muted-foreground">{new Date(c.endDate).toLocaleDateString("pt-BR")}</td>
                    <td className="text-center py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${contractStatusConfig[c.status].color}`}>
                        {contractStatusConfig[c.status].label}
                      </span>
                    </td>
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

export default ContractReports;
