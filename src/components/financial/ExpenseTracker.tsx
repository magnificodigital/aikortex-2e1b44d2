import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Pencil, Trash2, Eye, Filter } from "lucide-react";
import { Expense, mockExpenses, costCenterLabels, frequencyLabels } from "@/types/financial";
import { toast } from "@/hooks/use-toast";
import NewExpenseDialog from "./NewExpenseDialog";
import EditExpenseDialog from "./EditExpenseDialog";
import ExpenseDetailDialog from "./ExpenseDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const categoryColors: Record<string, string> = {
  Software: "hsl(217, 91%, 60%)",
  Marketing: "hsl(38, 92%, 50%)",
  Operacional: "hsl(142, 71%, 45%)",
  Pessoal: "hsl(280, 67%, 55%)",
  Impostos: "hsl(0, 72%, 51%)",
  Tecnologia: "hsl(190, 80%, 45%)",
};

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [showNew, setShowNew] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [filterCostCenter, setFilterCostCenter] = useState<string>("all");
  const [filterRecurring, setFilterRecurring] = useState<string>("all");

  const filtered = expenses.filter(e => {
    if (filterCostCenter !== "all" && e.costCenter !== filterCostCenter) return false;
    if (filterRecurring === "recurring" && !e.recurring) return false;
    if (filterRecurring === "one-time" && e.recurring) return false;
    return true;
  });

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);
  const recurringTotal = filtered.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0);
  const oneTimeTotal = filtered.filter(e => !e.recurring).reduce((s, e) => s + e.amount, 0);

  const byCategory = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    const newExpense: Expense = { ...expense, id: `e${Date.now()}` };
    setExpenses(prev => [newExpense, ...prev]);
    toast({ title: "Despesa registrada", description: `${expense.description} - R$ ${expense.amount.toLocaleString("pt-BR")}` });
  };

  const handleEditExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
    toast({ title: "Despesa atualizada", description: updated.description });
  };

  const handleDeleteExpense = () => {
    if (!deletingExpense) return;
    setExpenses(prev => prev.filter(e => e.id !== deletingExpense.id));
    toast({ title: "Despesa removida", description: deletingExpense.description });
    setDeletingExpense(null);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Despesas</p>
          <p className="text-xl font-bold text-foreground">R$ {totalExpenses.toLocaleString("pt-BR")}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Recorrentes</p>
          <p className="text-xl font-bold text-primary">R$ {recurringTotal.toLocaleString("pt-BR")}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Avulsas</p>
          <p className="text-xl font-bold text-foreground">R$ {oneTimeTotal.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <div className="glass-card rounded-xl p-5 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-foreground mb-1">Por Categoria</h3>
          <div className="h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={categoryColors[entry.name] || "hsl(215, 15%, 45%)"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[d.name] || "hsl(215, 15%, 45%)" }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground">Despesas Detalhadas</h3>
            <div className="flex items-center gap-2">
              <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Centro de Custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(costCenterLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRecurring} onValueChange={setFilterRecurring}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                  <SelectItem value="one-time">Avulsa</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setShowNew(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova
              </Button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Centro de Custo</TableHead>
                  <TableHead className="text-xs">Fornecedor</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(exp => (
                  <TableRow key={exp.id} className="border-border/30 group">
                    <TableCell className="text-sm text-foreground">{exp.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{costCenterLabels[exp.costCenter]}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{exp.vendor || "—"}</TableCell>
                    <TableCell className="text-sm font-semibold text-foreground">R$ {exp.amount.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {exp.recurring ? (frequencyLabels[exp.frequency!] || "Recorrente") : "Único"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingExpense(exp)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingExpense(exp)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingExpense(exp)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma despesa encontrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <NewExpenseDialog open={showNew} onOpenChange={setShowNew} onSave={handleAddExpense} />
      <EditExpenseDialog expense={editingExpense} open={!!editingExpense} onOpenChange={(o) => !o && setEditingExpense(null)} onSave={handleEditExpense} />
      <ExpenseDetailDialog expense={viewingExpense} open={!!viewingExpense} onOpenChange={(o) => !o && setViewingExpense(null)} onEdit={() => { setEditingExpense(viewingExpense); setViewingExpense(null); }} />

      <AlertDialog open={!!deletingExpense} onOpenChange={(o) => !o && setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingExpense?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseTracker;
