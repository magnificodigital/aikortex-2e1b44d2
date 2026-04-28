import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface QuickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const clients = ["TechFlow Corp", "Nova Digital", "Startup Hub", "MegaStore", "Fintech Plus", "EduTech"];
const sources = [
  { value: "project", label: "Projeto" },
  { value: "retainer", label: "Retainer" },
  { value: "consulting", label: "Consultoria" },
  { value: "subscription", label: "Assinatura" },
  { value: "implementation", label: "Implementação" },
];

const QuickSaleDialog = ({ open, onOpenChange }: QuickSaleDialogProps) => {
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("project");

  const handleSubmit = () => {
    if (!client || !amount) {
      toast({ title: "Preencha cliente e valor", variant: "destructive" });
      return;
    }
    toast({ title: "Venda registrada!", description: `R$ ${parseFloat(amount).toLocaleString("pt-BR")} - ${client}` });
    onOpenChange(false);
    setClient(""); setDescription(""); setAmount(""); setSource("project");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>⚡ Lançar Venda Rápida</DialogTitle>
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
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Serviço prestado..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sources.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar Venda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSaleDialog;
