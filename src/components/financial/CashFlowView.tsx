import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { mockCashFlow, mockBankAccounts, accountTypeLabels } from "@/types/financial";
import { Wallet, TrendingUp, TrendingDown, Building2 } from "lucide-react";

const CashFlowView = () => {
  const totalBalance = mockBankAccounts.reduce((s, a) => s + a.balance, 0);
  const lastCF = mockCashFlow[mockCashFlow.length - 1];
  const prevCF = mockCashFlow[mockCashFlow.length - 2];
  const balanceGrowth = prevCF ? (((lastCF.balance - prevCF.balance) / prevCF.balance) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* Accounts Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {mockBankAccounts.map(acc => (
          <div key={acc.id} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{acc.institution}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{acc.name}</p>
            <p className="text-[10px] text-muted-foreground mb-1">{accountTypeLabels[acc.type]}</p>
            <p className={`text-lg font-bold ${acc.balance >= 0 ? "text-foreground" : "text-destructive"}`}>
              R$ {acc.balance.toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>

      {/* Balance & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Saldo Total</span>
          </div>
          <p className="text-3xl font-bold text-foreground">R$ {(totalBalance / 1000).toFixed(1)}k</p>
          <div className="flex items-center gap-1 mt-2">
            {Number(balanceGrowth) >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            )}
            <span className={`text-xs ${Number(balanceGrowth) >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
              {balanceGrowth}% vs mês anterior
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entradas (Mar)</span>
              <span className="font-semibold text-[hsl(var(--success))]">R$ {(lastCF.income / 1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saídas (Mar)</span>
              <span className="font-semibold text-destructive">R$ {(lastCF.expenses / 1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border/50 pt-2">
              <span className="font-medium text-foreground">Resultado</span>
              <span className="font-bold text-foreground">R$ {((lastCF.income - lastCF.expenses) / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Fluxo de Caixa</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Entradas vs Saídas - Últimos 6 meses</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockCashFlow} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Entradas" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Saídas" fill="hsl(0, 72%, 51%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Accumulated Balance Line */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Saldo Acumulado</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Evolução do resultado líquido</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockCashFlow}>
              <defs>
                <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Area type="monotone" dataKey="balance" name="Saldo" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#gradBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CashFlowView;
