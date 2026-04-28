import { mockInvoices, mockExpenses, mockCashFlow } from "@/types/financial";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const ProfitLossView = () => {
  const totalRevenue = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pendingRevenue = mockInvoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);

  const expensesByCategory: Record<string, number> = {};
  mockExpenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  const totalExpenses = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0";

  const revenueBreakdown = [
    { name: "Retainers / Assinaturas", amount: 12700 },
    { name: "Projetos Únicos", amount: 21500 },
    { name: "Consultoria", amount: 15000 },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Receita Bruta</p>
          <p className="text-xl font-bold text-foreground">R$ {(totalRevenue / 1000).toFixed(1)}k</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" />
            <span className="text-[10px] text-[hsl(var(--success))]">+18% vs mês anterior</span>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Despesas Totais</p>
          <p className="text-xl font-bold text-foreground">R$ {(totalExpenses / 1000).toFixed(1)}k</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-destructive">+5% vs mês anterior</span>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Lucro Líquido</p>
          <p className={`text-xl font-bold ${grossProfit >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
            R$ {(grossProfit / 1000).toFixed(1)}k
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Minus className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Margem: {margin}%</span>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">A Receber</p>
          <p className="text-xl font-bold text-[hsl(var(--warning))]">R$ {(pendingRevenue / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground mt-1">{mockInvoices.filter(i => i.status === "pending").length} faturas pendentes</p>
        </div>
      </div>

      {/* DRE Statement */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Demonstrativo de Resultado (DRE)</h3>

        {/* Revenue */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Receitas</p>
          {revenueBreakdown.map(r => (
            <div key={r.name} className="flex justify-between py-1.5 text-sm">
              <span className="text-foreground">{r.name}</span>
              <span className="font-medium text-foreground">R$ {r.amount.toLocaleString("pt-BR")}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-semibold border-t border-border/50 mt-1">
            <span className="text-foreground">Total Receitas</span>
            <span className="text-[hsl(var(--success))]">R$ {totalRevenue.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Expenses */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Despesas</p>
          {Object.entries(expensesByCategory).map(([cat, amount]) => (
            <div key={cat} className="flex justify-between py-1.5 text-sm">
              <span className="text-foreground">{cat}</span>
              <span className="font-medium text-destructive">- R$ {amount.toLocaleString("pt-BR")}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm font-semibold border-t border-border/50 mt-1">
            <span className="text-foreground">Total Despesas</span>
            <span className="text-destructive">- R$ {totalExpenses.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Result */}
        <div className="flex justify-between py-3 text-lg font-bold">
          <span className="text-foreground">Resultado Líquido</span>
          <span className={grossProfit >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}>
            R$ {grossProfit.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* Trend */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Evolução Mensal</h3>
        <div className="space-y-2">
          {mockCashFlow.map(cf => {
            const result = cf.income - cf.expenses;
            const marginPct = ((result / cf.income) * 100).toFixed(0);
            return (
              <div key={cf.month} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">{cf.month}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-primary/20 rounded-full"
                    style={{ width: `${(cf.income / 130000) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 left-0 h-full bg-[hsl(var(--success))]/40 rounded-full"
                    style={{ width: `${(result / 130000) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-20 text-right">R$ {(result / 1000).toFixed(0)}k ({marginPct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProfitLossView;
