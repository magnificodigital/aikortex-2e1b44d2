import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockAccountsPayable, mockAccountsReceivable, paymentStatusConfig, costCenterLabels, AccountPayable, AccountReceivable, PaymentStatus, CostCenterType } from "@/types/financial";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Clock, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type DialogMode = "view" | "edit" | "create";

const AccountsView = () => {
  const [payables, setPayables] = useState<AccountPayable[]>(mockAccountsPayable);
  const [receivables, setReceivables] = useState<AccountReceivable[]>(mockAccountsReceivable);

  // Payable dialog state
  const [payableDialog, setPayableDialog] = useState<{ open: boolean; mode: DialogMode; item: AccountPayable | null }>({ open: false, mode: "view", item: null });
  // Receivable dialog state
  const [receivableDialog, setReceivableDialog] = useState<{ open: boolean; mode: DialogMode; item: AccountReceivable | null }>({ open: false, mode: "view", item: null });

  // Form state for payable
  const [pForm, setPForm] = useState({ vendor: "", description: "", amount: "", dueDate: "", category: "technology" as CostCenterType, status: "pending" as PaymentStatus });
  // Form state for receivable
  const [rForm, setRForm] = useState({ client: "", description: "", amount: "", dueDate: "", invoiceId: "", status: "pending" as PaymentStatus });

  const totalPayable = payables.reduce((s, a) => s + a.amount, 0);
  const overduePayable = payables.filter(a => a.status === "overdue");
  const totalReceivable = receivables.reduce((s, a) => s + a.amount, 0);
  const overdueReceivable = receivables.filter(a => a.status === "overdue");

  // Payable handlers
  const openPayableCreate = () => {
    setPForm({ vendor: "", description: "", amount: "", dueDate: "", category: "technology", status: "pending" });
    setPayableDialog({ open: true, mode: "create", item: null });
  };
  const openPayableEdit = (item: AccountPayable) => {
    setPForm({ vendor: item.vendor, description: item.description, amount: String(item.amount), dueDate: item.dueDate, category: item.category, status: item.status });
    setPayableDialog({ open: true, mode: "edit", item });
  };
  const openPayableView = (item: AccountPayable) => {
    setPayableDialog({ open: true, mode: "view", item });
  };
  const savePayable = () => {
    if (!pForm.vendor || !pForm.amount || !pForm.dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (payableDialog.mode === "create") {
      const newItem: AccountPayable = {
        id: `ap${Date.now()}`,
        vendor: pForm.vendor,
        description: pForm.description,
        amount: parseFloat(pForm.amount),
        dueDate: pForm.dueDate,
        status: pForm.status,
        category: pForm.category,
      };
      setPayables(prev => [...prev, newItem]);
      toast({ title: "Conta a pagar criada" });
    } else if (payableDialog.mode === "edit" && payableDialog.item) {
      setPayables(prev => prev.map(p => p.id === payableDialog.item!.id ? { ...p, vendor: pForm.vendor, description: pForm.description, amount: parseFloat(pForm.amount), dueDate: pForm.dueDate, status: pForm.status, category: pForm.category } : p));
      toast({ title: "Conta a pagar atualizada" });
    }
    setPayableDialog({ open: false, mode: "view", item: null });
  };
  const deletePayable = (id: string) => {
    setPayables(prev => prev.filter(p => p.id !== id));
    toast({ title: "Conta a pagar removida" });
  };

  // Receivable handlers
  const openReceivableCreate = () => {
    setRForm({ client: "", description: "", amount: "", dueDate: "", invoiceId: "", status: "pending" });
    setReceivableDialog({ open: true, mode: "create", item: null });
  };
  const openReceivableEdit = (item: AccountReceivable) => {
    setRForm({ client: item.client, description: item.description, amount: String(item.amount), dueDate: item.dueDate, invoiceId: item.invoiceId || "", status: item.status });
    setReceivableDialog({ open: true, mode: "edit", item });
  };
  const openReceivableView = (item: AccountReceivable) => {
    setReceivableDialog({ open: true, mode: "view", item });
  };
  const saveReceivable = () => {
    if (!rForm.client || !rForm.amount || !rForm.dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (receivableDialog.mode === "create") {
      const newItem: AccountReceivable = {
        id: `ar${Date.now()}`,
        client: rForm.client,
        description: rForm.description,
        amount: parseFloat(rForm.amount),
        dueDate: rForm.dueDate,
        status: rForm.status,
        invoiceId: rForm.invoiceId || undefined,
      };
      setReceivables(prev => [...prev, newItem]);
      toast({ title: "Conta a receber criada" });
    } else if (receivableDialog.mode === "edit" && receivableDialog.item) {
      setReceivables(prev => prev.map(r => r.id === receivableDialog.item!.id ? { ...r, client: rForm.client, description: rForm.description, amount: parseFloat(rForm.amount), dueDate: rForm.dueDate, status: rForm.status, invoiceId: rForm.invoiceId || undefined } : r));
      toast({ title: "Conta a receber atualizada" });
    }
    setReceivableDialog({ open: false, mode: "view", item: null });
  };
  const deleteReceivable = (id: string) => {
    setReceivables(prev => prev.filter(r => r.id !== id));
    toast({ title: "Conta a receber removida" });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-4 h-4 text-[hsl(var(--success))]" />
            <span className="text-[11px] text-muted-foreground">A Receber</span>
          </div>
          <p className="text-xl font-bold text-foreground">R$ {(totalReceivable / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">{receivables.length} títulos</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Recebíveis Atrasados</span>
          </div>
          <p className="text-xl font-bold text-destructive">R$ {(overdueReceivable.reduce((s, a) => s + a.amount, 0) / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">{overdueReceivable.length} títulos</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-destructive" />
            <span className="text-[11px] text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-xl font-bold text-foreground">R$ {(totalPayable / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">{payables.length} títulos</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[hsl(var(--warning))]" />
            <span className="text-[11px] text-muted-foreground">Pagáveis Atrasados</span>
          </div>
          <p className="text-xl font-bold text-[hsl(var(--warning))]">R$ {(overduePayable.reduce((s, a) => s + a.amount, 0) / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">{overduePayable.length} títulos</p>
        </div>
      </div>

      <Tabs defaultValue="receivable" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
            <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="receivable">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={openReceivableCreate}>
              <Plus className="w-4 h-4 mr-1" /> Nova Conta a Receber
            </Button>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs">Fatura</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map(ar => {
                  const cfg = paymentStatusConfig[ar.status];
                  return (
                    <TableRow key={ar.id} className="border-border/30">
                      <TableCell className="text-sm font-medium text-foreground">{ar.client}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ar.description}</TableCell>
                      <TableCell className="text-sm font-semibold text-foreground">R$ {ar.amount.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(ar.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{ar.invoiceId || "-"}</TableCell>
                      <TableCell><Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openReceivableView(ar)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openReceivableEdit(ar)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover conta a receber?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteReceivable(ar.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payable">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={openPayableCreate}>
              <Plus className="w-4 h-4 mr-1" /> Nova Conta a Pagar
            </Button>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Fornecedor</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs">Centro de Custo</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map(ap => {
                  const cfg = paymentStatusConfig[ap.status];
                  return (
                    <TableRow key={ap.id} className="border-border/30">
                      <TableCell className="text-sm font-medium text-foreground">{ap.vendor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ap.description}</TableCell>
                      <TableCell className="text-sm font-semibold text-foreground">R$ {ap.amount.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(ap.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{costCenterLabels[ap.category]}</TableCell>
                      <TableCell><Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPayableView(ap)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPayableEdit(ap)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover conta a pagar?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePayable(ap.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Receivable Dialog */}
      <Dialog open={receivableDialog.open} onOpenChange={(o) => !o && setReceivableDialog({ open: false, mode: "view", item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {receivableDialog.mode === "create" ? "Nova Conta a Receber" : receivableDialog.mode === "edit" ? "Editar Conta a Receber" : "Detalhes da Conta a Receber"}
            </DialogTitle>
          </DialogHeader>
          {receivableDialog.mode === "view" && receivableDialog.item ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Cliente</Label><p className="text-sm font-medium">{receivableDialog.item.client}</p></div>
                <div><Label className="text-xs text-muted-foreground">Valor</Label><p className="text-sm font-semibold">R$ {receivableDialog.item.amount.toLocaleString("pt-BR")}</p></div>
                <div><Label className="text-xs text-muted-foreground">Vencimento</Label><p className="text-sm">{new Date(receivableDialog.item.dueDate).toLocaleDateString("pt-BR")}</p></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><Badge variant="secondary" className={`text-[10px] ${paymentStatusConfig[receivableDialog.item.status].color}`}>{paymentStatusConfig[receivableDialog.item.status].label}</Badge></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Descrição</Label><p className="text-sm">{receivableDialog.item.description}</p></div>
              {receivableDialog.item.invoiceId && <div><Label className="text-xs text-muted-foreground">Fatura</Label><p className="text-sm font-mono">{receivableDialog.item.invoiceId}</p></div>}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Cliente *</Label>
                <Input value={rForm.client} onChange={e => setRForm(f => ({ ...f, client: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={rForm.description} onChange={e => setRForm(f => ({ ...f, description: e.target.value }))} placeholder="Serviço prestado..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valor (R$) *</Label>
                  <Input type="number" value={rForm.amount} onChange={e => setRForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <Label className="text-xs">Vencimento *</Label>
                  <Input type="date" value={rForm.dueDate} onChange={e => setRForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nº Fatura</Label>
                  <Input value={rForm.invoiceId} onChange={e => setRForm(f => ({ ...f, invoiceId: e.target.value }))} placeholder="INV-000" />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={rForm.status} onValueChange={v => setRForm(f => ({ ...f, status: v as PaymentStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {receivableDialog.mode === "view" ? (
              <Button variant="outline" onClick={() => setReceivableDialog({ open: false, mode: "view", item: null })}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setReceivableDialog({ open: false, mode: "view", item: null })}>Cancelar</Button>
                <Button onClick={saveReceivable}>{receivableDialog.mode === "create" ? "Criar" : "Salvar"}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payable Dialog */}
      <Dialog open={payableDialog.open} onOpenChange={(o) => !o && setPayableDialog({ open: false, mode: "view", item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {payableDialog.mode === "create" ? "Nova Conta a Pagar" : payableDialog.mode === "edit" ? "Editar Conta a Pagar" : "Detalhes da Conta a Pagar"}
            </DialogTitle>
          </DialogHeader>
          {payableDialog.mode === "view" && payableDialog.item ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Fornecedor</Label><p className="text-sm font-medium">{payableDialog.item.vendor}</p></div>
                <div><Label className="text-xs text-muted-foreground">Valor</Label><p className="text-sm font-semibold">R$ {payableDialog.item.amount.toLocaleString("pt-BR")}</p></div>
                <div><Label className="text-xs text-muted-foreground">Vencimento</Label><p className="text-sm">{new Date(payableDialog.item.dueDate).toLocaleDateString("pt-BR")}</p></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><Badge variant="secondary" className={`text-[10px] ${paymentStatusConfig[payableDialog.item.status].color}`}>{paymentStatusConfig[payableDialog.item.status].label}</Badge></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Descrição</Label><p className="text-sm">{payableDialog.item.description}</p></div>
              <div><Label className="text-xs text-muted-foreground">Centro de Custo</Label><p className="text-sm">{costCenterLabels[payableDialog.item.category]}</p></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Fornecedor *</Label>
                <Input value={pForm.vendor} onChange={e => setPForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Nome do fornecedor" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} placeholder="Serviço ou produto..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valor (R$) *</Label>
                  <Input type="number" value={pForm.amount} onChange={e => setPForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <Label className="text-xs">Vencimento *</Label>
                  <Input type="date" value={pForm.dueDate} onChange={e => setPForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Centro de Custo</Label>
                  <Select value={pForm.category} onValueChange={v => setPForm(f => ({ ...f, category: v as CostCenterType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(costCenterLabels).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={pForm.status} onValueChange={v => setPForm(f => ({ ...f, status: v as PaymentStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {payableDialog.mode === "view" ? (
              <Button variant="outline" onClick={() => setPayableDialog({ open: false, mode: "view", item: null })}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setPayableDialog({ open: false, mode: "view", item: null })}>Cancelar</Button>
                <Button onClick={savePayable}>{payableDialog.mode === "create" ? "Criar" : "Salvar"}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsView;
