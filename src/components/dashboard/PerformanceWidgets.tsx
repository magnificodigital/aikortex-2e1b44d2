import { AreaChart, Area, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { m: "Set", v: 68 }, { m: "Out", v: 74 }, { m: "Nov", v: 82 },
  { m: "Dez", v: 91 }, { m: "Jan", v: 105 }, { m: "Fev", v: 124 },
];

const clientData = [
  { m: "Set", v: 28 }, { m: "Out", v: 31 }, { m: "Nov", v: 35 },
  { m: "Dez", v: 38 }, { m: "Jan", v: 42 }, { m: "Fev", v: 47 },
];

const automationData = [
  { m: "Set", v: 85 }, { m: "Out", v: 88 }, { m: "Nov", v: 92 },
  { m: "Dez", v: 87 }, { m: "Jan", v: 95 }, { m: "Fev", v: 97 },
];

const projectData = [
  { m: "Set", v: 4 }, { m: "Out", v: 6 }, { m: "Nov", v: 3 },
  { m: "Dez", v: 7 }, { m: "Jan", v: 5 }, { m: "Fev", v: 8 },
];

const widgets = [
  { title: "Receita", value: "R$ 124k", change: "+18%", data: revenueData, color: "hsl(142, 71%, 45%)", type: "area" as const },
  { title: "Clientes", value: "47", change: "+12%", data: clientData, color: "hsl(217, 91%, 60%)", type: "area" as const },
  { title: "Automações", value: "97%", change: "uptime", data: automationData, color: "hsl(38, 92%, 50%)", type: "area" as const },
  { title: "Projetos Concluídos", value: "8", change: "este mês", data: projectData, color: "hsl(199, 89%, 48%)", type: "bar" as const },
];

const PerformanceWidgets = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {widgets.map((w) => (
      <div key={w.title} className="glass-card rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{w.title}</span>
          <span className="text-[10px] font-medium text-[hsl(var(--success))]">{w.change}</span>
        </div>
        <div className="text-lg font-bold text-foreground">{w.value}</div>
        <div className="h-12 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            {w.type === "area" ? (
              <AreaChart data={w.data}>
                <defs>
                  <linearGradient id={`grad-${w.title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={w.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={w.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={w.color} strokeWidth={1.5} fill={`url(#grad-${w.title})`} />
              </AreaChart>
            ) : (
              <BarChart data={w.data}>
                <Bar dataKey="v" fill={w.color} radius={[2, 2, 0, 0]} opacity={0.7} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    ))}
  </div>
);

export default PerformanceWidgets;
