import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  mockInvoices,
  mockExpenses,
  mockSubscriptions,
  mockAccountsReceivable,
  mockCashFlow,
} from "@/types/financial";

const FinancialReportsView = () => {
  const [period, setPeriod] = useState("12");

  // Metrics
  const receitaTotal = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const despesaTotal = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const lucroLiquido = receitaTotal - despesaTotal;
  const overdueTotal = mockAccountsReceivable.filter(a => a.status === "overdue").reduce((s, a) => s + a.amount, 0);
  const inadimplencia = receitaTotal > 0 ? ((overdueTotal / (receitaTotal + overdueTotal)) * 100).toFixed(1) : "0.0";

  const recebido = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const emAtraso = overdueTotal;
  const ticketMedio = mockInvoices.filter(i => i.status === "paid").length > 0
    ? receitaTotal / mockInvoices.filter(i => i.status === "paid").length
    : 0;
  const assinaturasAtivas = mockSubscriptions.filter(s => s.status === "active").length;
  const mrrInterno = mockSubscriptions.filter(s => s.status === "active" && s.frequency === "monthly").reduce((s, sub) => s + sub.amount, 0);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const topMetrics = [
    { label: "Receita Total", value: fmt(receitaTotal), icon: TrendingUp, color: "text-[hsl(var(--success))]" },
    { label: "Despesa Total", value: fmt(despesaTotal), icon: TrendingDown, color: "text-destructive" },
    { label: "Lucro Líquido", value: fmt(lucroLiquido), icon: DollarSign, color: lucroLiquido >= 0 ? "text-[hsl(var(--success))]" : "text-destructive" },
    { label: "Inadimplência", value: `${inadimplencia}%`, icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
  ];

  const bottomMetrics = [
    { label: "Recebido", value: fmt(recebido), color: "text-foreground" },
    { label: "Em Atraso", value: fmt(emAtraso), color: "text-destructive" },
    { label: "Ticket Médio", value: fmt(ticketMedio), color: "text-foreground" },
    { label: "Assinaturas Ativas", value: String(assinaturasAtivas), color: "text-foreground" },
    { label: "MRR Interno", value: fmt(mrrInterno), color: "text-[hsl(var(--success))]" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Relatórios Financeiros</h2>
          <p className="text-sm text-muted-foreground">Visão completa das suas finanças</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-sm text-muted-foreground">{m.label}</span>
              </div>
              <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom 5 metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {bottomMetrics.map((m) => (
          <div key={m.label} className="glass-card rounded-xl p-4">
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <p className={`text-lg font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Receita vs Despesa Chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Receita vs Despesa</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockCashFlow} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 8%, 18%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(228, 8%, 50%)" }} />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "hsl(228, 8%, 50%)" }} />
              <Tooltip
                formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
                contentStyle={{ backgroundColor: "hsl(228, 14%, 13%)", border: "1px solid hsl(228, 8%, 18%)", borderRadius: 8 }}
                labelStyle={{ color: "hsl(228, 8%, 70%)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Despesa" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportsView;
