import { mockBudget, mockCostCenters, costCenterLabels } from "@/types/financial";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const BudgetTracker = () => {
  const { totalBudget, totalSpent, categories } = mockBudget;
  const totalPct = Math.round((totalSpent / totalBudget) * 100);

  const pieData = mockCostCenters.map(cc => ({
    name: cc.name,
    value: cc.spent,
    color: cc.color,
  }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Orçamento Mensal</h3>
          <div className="text-center mb-4">
            <p className="text-3xl font-bold text-foreground">R$ {(totalSpent / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">de R$ {(totalBudget / 1000).toFixed(0)}k orçados</p>
          </div>
          <Progress value={totalPct} className="h-3 mb-2" />
          <div className="flex justify-between text-[11px]">
            <span className={totalPct > 80 ? "text-destructive" : "text-[hsl(var(--success))]"}>
              {totalPct}% utilizado
            </span>
            <span className="text-muted-foreground">
              R$ {((totalBudget - totalSpent) / 1000).toFixed(1)}k restante
            </span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-foreground mb-2">Distribuição de Custos</h3>
          <div className="h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Alertas</h3>
          <div className="space-y-3">
            {categories
              .map(c => ({ ...c, pct: Math.round((c.actual / c.budgeted) * 100) }))
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 5)
              .map(c => (
                <div key={c.name} className="flex items-center gap-2">
                  {c.pct > 75 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground truncate">{c.name}</span>
                      <span className={c.pct > 75 ? "text-[hsl(var(--warning))]" : "text-muted-foreground"}>{c.pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Detalhamento por Centro de Custo</h3>
        <div className="space-y-4">
          {categories.map(c => {
            const pct = Math.round((c.actual / c.budgeted) * 100);
            return (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">R$ {c.actual.toLocaleString("pt-BR")} / R$ {c.budgeted.toLocaleString("pt-BR")}</span>
                    <span className={`font-semibold ${pct > 90 ? "text-destructive" : pct > 75 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;
