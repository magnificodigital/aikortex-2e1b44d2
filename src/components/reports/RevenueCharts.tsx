import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const revenueByMonth = [
  { month: "Set", receita: 52000, despesas: 18000 },
  { month: "Out", receita: 61000, despesas: 19500 },
  { month: "Nov", receita: 68000, despesas: 21000 },
  { month: "Dez", receita: 74000, despesas: 22000 },
  { month: "Jan", receita: 89000, despesas: 23500 },
  { month: "Fev", receita: 105000, despesas: 24000 },
  { month: "Mar", receita: 124000, despesas: 25500 },
];

const revenueBySource = [
  { name: "Retainer", value: 38000 },
  { name: "Assinatura", value: 28000 },
  { name: "Projeto", value: 35000 },
  { name: "Consultoria", value: 15000 },
  { name: "Implementação", value: 8000 },
];

const revenueByClient = [
  { client: "TechFlow", value: 8500 },
  { client: "Fintech+", value: 15000 },
  { client: "Startup Hub", value: 12000 },
  { client: "EduTech", value: 9500 },
  { client: "MegaStore", value: 6800 },
  { client: "Nova Digital", value: 4200 },
];

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 70%, 55%)",
];

const RevenueCharts = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Revenue trend */}
    <div className="glass-card rounded-xl p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold text-foreground mb-4">Receita vs Despesas (6 meses)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueByMonth}>
            <defs>
              <linearGradient id="grad-receita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-despesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" tickFormatter={v => `${v / 1000}k`} />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
            <Legend />
            <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#grad-receita)" />
            <Area type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} fill="url(#grad-despesas)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Revenue by source */}
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Fonte</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={revenueBySource} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
              {revenueBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Revenue by client */}
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Cliente</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueByClient} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" tickFormatter={v => `${v / 1000}k`} />
            <YAxis type="category" dataKey="client" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" width={70} />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
            <Bar dataKey="value" name="Receita" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default RevenueCharts;
