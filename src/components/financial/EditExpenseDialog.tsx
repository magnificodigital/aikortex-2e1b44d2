import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Expense, costCenterLabels, CostCenterType, frequencyLabels, PaymentFrequency } from "@/types/financial";

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Expense) => void;
}

const paymentMethods = ["PIX", "Cartão Corporativo", "Boleto", "Transferência", "DARF", "Débito Automático"];

const EditExpenseDialog = ({ expense, open, onOpenChange, onSave }: EditExpenseDialogProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [costCenter, setCostCenter] = useState<CostCenterType | "">("");
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(String(expense.amount));
      setDate(expense.date);
      setCostCenter(expense.costCenter);
      setCategory(expense.category);
      setVendor(expense.vendor || "");
      setPaymentMethod(expense.paymentMethod || "");
      setRecurring(expense.recurring);
      setFrequency(expense.frequency || "monthly");
      setNotes(expense.notes || "");
    }
  }, [expense]);

  const handleSubmit = () => {
    if (!expense || !description || !amount || !date || !costCenter) return;
    onSave({
      ...expense,
      description,
      amount: parseFloat(amount),
      date,
      costCenter: costCenter as CostCenterType,
      category,
      vendor: vendor || undefined,
      paymentMethod: paymentMethod || undefined,
      recurring,
      frequency: recurring ? frequency : undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Centro de Custo *</Label>
              <Select value={costCenter} onValueChange={(v) => setCostCenter(v as CostCenterType)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(costCenterLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div>
              <Label className="text-sm font-medium">Despesa Recorrente</Label>
              <p className="text-[11px] text-muted-foreground">Repete automaticamente</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
          {recurring && (
            <div>
              <Label className="text-xs">Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as PaymentFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseDialog;
