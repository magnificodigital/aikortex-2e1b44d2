import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockAccountsReceivable, mockAccountsPayable, mockTransactions, TransactionType } from "@/types/financial";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2, Circle } from "lucide-react";

const typeConfig: Record<TransactionType, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
  income: { label: "Entrada", icon: ArrowDownLeft, color: "text-[hsl(var(--success))]" },
  expense: { label: "Saída", icon: ArrowUpRight, color: "text-destructive" },
  transfer: { label: "Transferência", icon: ArrowLeftRight, color: "text-primary" },
};

const FinancialOverview = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Contas a Receber
  const receivablePaid = mockAccountsReceivable.filter(a => a.status === "paid").reduce((s, a) => s + a.amount, 0);
  const receivablePending = mockAccountsReceivable.filter(a => a.status === "pending").reduce((s, a) => s + a.amount, 0);
  const receivableOverdue = mockAccountsReceivable.filter(a => a.status === "overdue").reduce((s, a) => s + a.amount, 0);
  const receivableTotal = receivablePaid + receivablePending + receivableOverdue;

  // Contas a Pagar
  const payablePaid = mockAccountsPayable.filter(a => a.status === "paid").reduce((s, a) => s + a.amount, 0);
  const payablePending = mockAccountsPayable.filter(a => a.status === "pending").reduce((s, a) => s + a.amount, 0);
  const payableOverdue = mockAccountsPayable.filter(a => a.status === "overdue").reduce((s, a) => s + a.amount, 0);
  const payableTotal = payablePaid + payablePending + payableOverdue;

  // Lucro
  const totalReceitas = mockTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalDespesas = mockTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  // Filtered transactions
  const filtered = mockTransactions.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "reconciled" && !t.reconciled) return false;
      if (statusFilter === "pending" && t.reconciled) return false;
    }
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const categories = [...new Set(mockTransactions.map(t => t.category))];

  return (
    <div className="space-y-6">
      {/* 3 Summary Cards - dgflow style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contas a Receber */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[hsl(var(--success))]" />
            </div>
            <h3 className="font-semibold text-foreground">Contas a Receber</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recebido</span>
              <span className="text-sm font-semibold text-[hsl(var(--success))]">R$ {receivablePaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pendente</span>
              <span className="text-sm font-semibold text-[hsl(var(--warning))]">R$ {receivablePending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vencido</span>
              <span className="text-sm font-semibold text-destructive">R$ {receivableOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-base font-bold text-foreground">R$ {receivableTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Contas a Pagar */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="font-semibold text-foreground">Contas a Pagar</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pago</span>
              <span className="text-sm font-semibold text-[hsl(var(--success))]">R$ {payablePaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pendente</span>
              <span className="text-sm font-semibold text-[hsl(var(--warning))]">R$ {payablePending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vencido</span>
              <span className="text-sm font-semibold text-destructive">R$ {payableOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-base font-bold text-foreground">R$ {payableTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Lucro do Período */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Lucro do Período</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receitas</span>
              <span className="text-sm font-semibold text-[hsl(var(--success))]">R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Despesas</span>
              <span className="text-sm font-semibold text-destructive">R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">Lucro Líquido</span>
              <span className={`text-base font-bold ${lucroLiquido >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                R$ {lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Transações</h3>
        
        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="income">Entradas</SelectItem>
              <SelectItem value="expense">Saídas</SelectItem>
              <SelectItem value="transfer">Transferências</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="reconciled">Conciliado</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 h-9" placeholder="dd/mm/aaaa" />
          <span className="flex items-center text-muted-foreground text-sm">-</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 h-9" placeholder="dd/mm/aaaa" />
        </div>

        {/* Transactions Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-center">Conciliado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const cfg = typeConfig[t.type];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={t.id} className="border-border/30">
                      <TableCell><Icon className={`w-4 h-4 ${cfg.color}`} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-sm text-foreground">{t.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.category}</TableCell>
                      <TableCell className={`text-sm font-semibold ${t.type === "income" ? "text-[hsl(var(--success))]" : t.type === "expense" ? "text-destructive" : "text-foreground"}`}>
                        {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}R$ {t.amount.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {t.reconciled ? (
                          <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] mx-auto" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;
