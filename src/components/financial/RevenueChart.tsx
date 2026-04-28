import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const monthlyData = [
  { month: "Set", receita: 68000, despesas: 18000 },
  { month: "Out", receita: 74000, despesas: 19500 },
  { month: "Nov", receita: 82000, despesas: 21000 },
  { month: "Dez", receita: 91000, despesas: 22000 },
  { month: "Jan", receita: 105000, despesas: 24000 },
  { month: "Fev", receita: 118000, despesas: 25000 },
  { month: "Mar", receita: 124000, despesas: 26500 },
];

const clientRevenue = [
  { client: "Fintech Plus", value: 15000 },
  { client: "Startup Hub", value: 12000 },
  { client: "EduTech", value: 9500 },
  { client: "TechFlow", value: 8500 },
  { client: "MegaStore", value: 6800 },
  { client: "Nova Digital", value: 4200 },
];

const RevenueChart = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Receita vs Despesas</h3>
          <p className="text-[11px] text-muted-foreground">Últimos 7 meses</p>
        </div>
        <span className="text-[10px] font-medium text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 px-2 py-1 rounded-full">+18% MoM</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 15%, 45%)" }} />
            <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "hsl(215, 15%, 45%)" }} />
            <Tooltip formatter={(v: number) => `R$ ${(v / 1000).toFixed(1)}k`} />
            <Area type="monotone" dataKey="receita" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#gradReceita)" />
            <Area type="monotone" dataKey="despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={1.5} fill="url(#gradDespesas)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Receita por Cliente</h3>
        <p className="text-[11px] text-muted-foreground">Este mês</p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={clientRevenue} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" />
            <XAxis type="number" tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "hsl(215, 15%, 45%)" }} />
            <YAxis type="category" dataKey="client" tick={{ fontSize: 11, fill: "hsl(215, 15%, 45%)" }} width={90} />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
            <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default RevenueChart;
