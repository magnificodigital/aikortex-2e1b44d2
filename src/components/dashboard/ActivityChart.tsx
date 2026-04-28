import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const data = [
  { day: "Mon", inferences: 1240, tokens: 820 },
  { day: "Tue", inferences: 1680, tokens: 1100 },
  { day: "Wed", inferences: 1420, tokens: 980 },
  { day: "Thu", inferences: 2100, tokens: 1560 },
  { day: "Fri", inferences: 2480, tokens: 1840 },
  { day: "Sat", inferences: 1980, tokens: 1420 },
  { day: "Sun", inferences: 2640, tokens: 2100 },
];

export function ActivityChart() {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Neural Activity</h3>
          <p className="text-xs text-muted-foreground">Inferences & token throughput · last 7 days</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" /> Inferences
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-accent" /> Tokens
          </span>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(180 100% 55%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(180 100% 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(280 100% 65%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(280 100% 65%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area type="monotone" dataKey="inferences" stroke="hsl(180 100% 55%)" strokeWidth={2} fill="url(#g1)" />
            <Area type="monotone" dataKey="tokens" stroke="hsl(280 100% 65%)" strokeWidth={2} fill="url(#g2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
