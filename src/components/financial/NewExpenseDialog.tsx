import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { costCenterLabels, CostCenterType, frequencyLabels, PaymentFrequency } from "@/types/financial";

interface NewExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (expense: Omit<import("@/types/financial").Expense, "id">) => void;
}

const paymentMethods = ["PIX", "Cartão Corporativo", "Boleto", "Transferência", "DARF", "Débito Automático"];

const NewExpenseDialog = ({ open, onOpenChange, onSave }: NewExpenseDialogProps) => {
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

  const handleSubmit = () => {
    if (!description || !amount || !date || !costCenter) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const expenseData = {
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
    };
    if (onSave) {
      onSave(expenseData);
    } else {
      toast({ title: "Despesa registrada", description: `${description} - R$ ${amount}` });
    }
    onOpenChange(false);
    setDescription(""); setAmount(""); setDate(""); setCostCenter(""); setCategory("");
    setVendor(""); setPaymentMethod(""); setRecurring(false); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Servidor Cloud AWS" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
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
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Software" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Ex: AWS" />
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
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar Despesa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewExpenseDialog;
