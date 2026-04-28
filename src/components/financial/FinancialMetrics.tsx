import { DollarSign, TrendingUp, Clock, AlertTriangle, Wallet, PiggyBank, CreditCard, BarChart3 } from "lucide-react";
import { mockInvoices, mockSubscriptions, mockExpenses, mockBankAccounts, mockAccountsReceivable, mockAccountsPayable } from "@/types/financial";

const FinancialMetrics = () => {
  const totalPaid = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = mockInvoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = mockInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const mrr = mockSubscriptions.filter(s => s.status === "active" && s.frequency === "monthly").reduce((s, sub) => s + sub.amount, 0);
  const totalExpenses = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const totalBalance = mockBankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalReceivable = mockAccountsReceivable.reduce((s, a) => s + a.amount, 0);
  const totalPayable = mockAccountsPayable.reduce((s, a) => s + a.amount, 0);

  const metrics = [
    { label: "MRR", value: `R$ ${(mrr / 1000).toFixed(1)}k`, sub: "+18% vs mês anterior", icon: TrendingUp, accent: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
    { label: "Saldo Total", value: `R$ ${(totalBalance / 1000).toFixed(0)}k`, sub: "Todas as contas", icon: Wallet, accent: "bg-primary/10 text-primary" },
    { label: "Receita Realizada", value: `R$ ${(totalPaid / 1000).toFixed(1)}k`, sub: "este mês", icon: DollarSign, accent: "bg-primary/10 text-primary" },
    { label: "Despesas", value: `R$ ${(totalExpenses / 1000).toFixed(1)}k`, sub: `Margem: ${((1 - totalExpenses / (totalPaid || 1)) * 100).toFixed(0)}%`, icon: CreditCard, accent: "bg-destructive/10 text-destructive" },
    { label: "A Receber", value: `R$ ${(totalReceivable / 1000).toFixed(1)}k`, sub: `${mockAccountsReceivable.length} títulos`, icon: Clock, accent: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    { label: "A Pagar", value: `R$ ${(totalPayable / 1000).toFixed(1)}k`, sub: `${mockAccountsPayable.length} títulos`, icon: BarChart3, accent: "bg-destructive/10 text-destructive" },
    { label: "Pendente", value: `R$ ${(totalPending / 1000).toFixed(1)}k`, sub: `${mockInvoices.filter(i => i.status === "pending").length} faturas`, icon: PiggyBank, accent: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    { label: "Atrasado", value: `R$ ${(totalOverdue / 1000).toFixed(1)}k`, sub: `${mockInvoices.filter(i => i.status === "overdue").length} faturas`, icon: AlertTriangle, accent: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(m => (
        <div key={m.label} className="glass-card rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent}`}>
              <m.icon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{m.value}</div>
            <div className="text-[11px] text-muted-foreground">{m.label}</div>
            <div className="text-[10px] text-[hsl(var(--success))] mt-1">{m.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinancialMetrics;
