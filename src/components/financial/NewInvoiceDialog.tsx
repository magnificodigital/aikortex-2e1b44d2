import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const clients = ["TechFlow Corp", "Nova Digital", "Startup Hub", "MegaStore", "Fintech Plus", "EduTech"];

const NewInvoiceDialog = ({ open, onOpenChange }: NewInvoiceDialogProps) => {
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = () => {
    if (!client || !amount || !dueDate) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    toast({ title: "Fatura criada", description: `Fatura de R$ ${amount} para ${client}` });
    onOpenChange(false);
    setClient(""); setDescription(""); setAmount(""); setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Cliente *</Label>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Serviços prestados..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar Fatura</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewInvoiceDialog;
