import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Eye, TrendingUp, TrendingDown, AlertTriangle, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CostCenterType, costCenterLabels, mockExpenses } from "@/types/financial";
import { toast } from "@/hooks/use-toast";

interface CostCenter {
  id: string;
  name: string;
  type: CostCenterType;
  budget: number;
  spent: number;
  description: string;
  responsible: string;
  active: boolean;
}

const initialCostCenters: CostCenter[] = [
  { id: "cc1", name: "Tecnologia & Infraestrutura", type: "technology", budget: 25000, spent: 18500, description: "Servidores, licenças e ferramentas de desenvolvimento", responsible: "CTO", active: true },
  { id: "cc2", name: "Marketing Digital", type: "marketing", budget: 15000, spent: 12300, description: "Campanhas, mídia paga e produção de conteúdo", responsible: "CMO", active: true },
  { id: "cc3", name: "Pessoal & RH", type: "personnel", budget: 85000, spent: 82000, description: "Salários, benefícios e treinamentos", responsible: "RH", active: true },
  { id: "cc4", name: "Operações", type: "operational", budget: 10000, spent: 6800, description: "Despesas operacionais gerais do dia-a-dia", responsible: "COO", active: true },
  { id: "cc5", name: "Infraestrutura Física", type: "infrastructure", budget: 8000, spent: 7200, description: "Aluguel, energia, internet e manutenção", responsible: "Admin", active: true },
  { id: "cc6", name: "Ferramentas SaaS", type: "tools", budget: 5000, spent: 4100, description: "Assinaturas de ferramentas e plataformas", responsible: "CTO", active: true },
  { id: "cc7", name: "Impostos & Tributos", type: "taxes", budget: 20000, spent: 18900, description: "ISS, IRPJ, CSLL e outros tributos", responsible: "Contabilidade", active: true },
  { id: "cc8", name: "Projetos Especiais", type: "other", budget: 12000, spent: 3500, description: "Investimentos em novos projetos e inovação", responsible: "CEO", active: true },
];

const chartColors = [
  "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)", "hsl(280, 67%, 55%)",
  "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)", "hsl(190, 80%, 45%)",
  "hsl(330, 70%, 50%)", "hsl(50, 80%, 50%)",
];

const CostCenterView = () => {
  const [costCenters, setCostCenters] = useState<CostCenter[]>(initialCostCenters);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [viewing, setViewing] = useState<CostCenter | null>(null);
  const [deleting, setDeleting] = useState<CostCenter | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CostCenterType>("operational");
  const [formBudget, setFormBudget] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formResponsible, setFormResponsible] = useState("");
  const [formActive, setFormActive] = useState(true);

  const totalBudget = costCenters.filter(c => c.active).reduce((s, c) => s + c.budget, 0);
  const totalSpent = costCenters.filter(c => c.active).reduce((s, c) => s + c.spent, 0);
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const overBudgetCount = costCenters.filter(c => c.active && c.spent > c.budget).length;

  const barData = costCenters.filter(c => c.active).map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "…" : c.name,
    Orçamento: c.budget,
    Gasto: c.spent,
  }));

  const pieData = costCenters.filter(c => c.active).map(c => ({
    name: c.name,
    value: c.spent,
  }));

  const openNewForm = () => {
    setFormName(""); setFormType("operational"); setFormBudget(""); setFormDescription(""); setFormResponsible(""); setFormActive(true);
    setEditing(null);
    setShowForm(true);
  };

  const openEditForm = (cc: CostCenter) => {
    setFormName(cc.name); setFormType(cc.type); setFormBudget(String(cc.budget)); setFormDescription(cc.description); setFormResponsible(cc.responsible); setFormActive(cc.active);
    setEditing(cc);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formName || !formBudget) {
      toast({ title: "Preencha nome e orçamento", variant: "destructive" });
      return;
    }
    if (editing) {
      setCostCenters(prev => prev.map(c => c.id === editing.id ? {
        ...c, name: formName, type: formType, budget: parseFloat(formBudget), description: formDescription, responsible: formResponsible, active: formActive,
      } : c));
      toast({ title: "Centro de custo atualizado", description: formName });
    } else {
      const newCC: CostCenter = {
        id: `cc${Date.now()}`, name: formName, type: formType, budget: parseFloat(formBudget), spent: 0, description: formDescription, responsible: formResponsible, active: formActive,
      };
      setCostCenters(prev => [...prev, newCC]);
      toast({ title: "Centro de custo criado", description: formName });
    }
    setShowForm(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setCostCenters(prev => prev.filter(c => c.id !== deleting.id));
    toast({ title: "Centro de custo removido", description: deleting.name });
    setDeleting(null);
  };

  const getUsageColor = (spent: number, budget: number) => {
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    if (pct >= 100) return "text-destructive";
    if (pct >= 80) return "text-yellow-500";
    return "text-emerald-500";
  };

  const getProgressColor = (spent: number, budget: number) => {
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    if (pct >= 100) return "[&>div]:bg-destructive";
    if (pct >= 80) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-emerald-500";
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Orçamento Total</p>
          <p className="text-xl font-bold text-foreground">R$ {totalBudget.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Gasto</p>
          <p className="text-xl font-bold text-primary">R$ {totalSpent.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Utilização</p>
          <p className={`text-xl font-bold ${utilizationRate >= 90 ? "text-destructive" : "text-foreground"}`}>
            {utilizationRate.toFixed(1)}%
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Acima do Orçamento</p>
          <p className={`text-xl font-bold ${overBudgetCount > 0 ? "text-destructive" : "text-emerald-500"}`}>
            {overBudgetCount} {overBudgetCount === 1 ? "centro" : "centros"}
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Orçamento vs Gasto por Centro</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="Orçamento" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gasto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição de Gastos</h3>
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                {d.name.length > 12 ? d.name.substring(0, 12) + "…" : d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Centros de Custo</h3>
          </div>
          <Button size="sm" onClick={openNewForm}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Centro
          </Button>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Responsável</TableHead>
                <TableHead className="text-xs">Orçamento</TableHead>
                <TableHead className="text-xs">Gasto</TableHead>
                <TableHead className="text-xs w-[140px]">Utilização</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.map(cc => {
                const pct = cc.budget > 0 ? (cc.spent / cc.budget) * 100 : 0;
                return (
                  <TableRow key={cc.id} className="border-border/30 group">
                    <TableCell className="text-sm font-medium text-foreground">{cc.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{costCenterLabels[cc.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cc.responsible}</TableCell>
                    <TableCell className="text-sm text-foreground">R$ {cc.budget.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className={`text-sm font-semibold ${getUsageColor(cc.spent, cc.budget)}`}>
                      R$ {cc.spent.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(pct, 100)} className={`h-2 flex-1 ${getProgressColor(cc.spent, cc.budget)}`} />
                        <span className={`text-[10px] font-medium ${getUsageColor(cc.spent, cc.budget)}`}>
                          {pct.toFixed(0)}%
                        </span>
                        {pct >= 90 && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cc.active ? "default" : "outline"} className="text-[10px]">
                        {cc.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(cc)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(cc)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting(cc)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Marketing Digital" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo *</Label>
                <Select value={formType} onValueChange={v => setFormType(v as CostCenterType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(costCenterLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Orçamento Mensal (R$) *</Label>
                <Input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Responsável</Label>
              <Input value={formResponsible} onChange={e => setFormResponsible(e.target.value)} placeholder="Ex: CTO" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descreva o centro de custo..." rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <Label className="text-sm font-medium">Ativo</Label>
                <p className="text-[11px] text-muted-foreground">Centro de custo visível nos relatórios</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar Alterações" : "Criar Centro"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Centro de Custo
              {viewing && <Badge variant="secondary" className="text-[10px]">{viewing.id}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              {[
                { label: "Nome", value: viewing.name },
                { label: "Tipo", value: costCenterLabels[viewing.type] },
                { label: "Responsável", value: viewing.responsible || "—" },
                { label: "Orçamento", value: `R$ ${viewing.budget.toLocaleString("pt-BR")}` },
                { label: "Gasto Atual", value: `R$ ${viewing.spent.toLocaleString("pt-BR")}` },
                { label: "Utilização", value: `${viewing.budget > 0 ? ((viewing.spent / viewing.budget) * 100).toFixed(1) : 0}%` },
                { label: "Status", value: viewing.active ? "Ativo" : "Inativo" },
                { label: "Descrição", value: viewing.description || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start border-b border-border/30 pb-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button>
            <Button onClick={() => { if (viewing) { openEditForm(viewing); setViewing(null); } }}>
              <Pencil className="w-4 h-4 mr-1" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleting?.name}"? Despesas vinculadas não serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CostCenterView;
