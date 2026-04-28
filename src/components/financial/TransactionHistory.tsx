import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockTransactions, TransactionType } from "@/types/financial";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Search, CheckCircle2, Circle } from "lucide-react";

const typeConfig: Record<TransactionType, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
  income: { label: "Entrada", icon: ArrowDownLeft, color: "text-[hsl(var(--success))]" },
  expense: { label: "Saída", icon: ArrowUpRight, color: "text-destructive" },
  transfer: { label: "Transferência", icon: ArrowLeftRight, color: "text-primary" },
};

const TransactionHistory = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = mockTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-[11px] text-muted-foreground">Entradas</p>
          <p className="text-lg font-bold text-[hsl(var(--success))]">R$ {totalIncome.toLocaleString("pt-BR")}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-[11px] text-muted-foreground">Saídas</p>
          <p className="text-lg font-bold text-destructive">R$ {totalExpense.toLocaleString("pt-BR")}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-[11px] text-muted-foreground">Resultado</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-foreground" : "text-destructive"}`}>
            R$ {(totalIncome - totalExpense).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar transações..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="income">Entradas</SelectItem>
            <SelectItem value="expense">Saídas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
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
      </div>
    </div>
  );
};

export default TransactionHistory;
