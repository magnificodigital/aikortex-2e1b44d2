import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Contract, ContractStatus, ContractType, contractTypeConfig, contractStatusConfig } from "@/types/contract";

interface EditContractDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditContractDialog = ({ contract, open, onOpenChange }: EditContractDialogProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [value, setValue] = useState("");
  const [frequency, setFrequency] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Sync state when contract changes
  const prevId = useState<string | null>(null);
  if (contract && contract.id !== prevId[0]) {
    prevId[1](contract.id);
    setName(contract.name);
    setType(contract.type);
    setValue(contract.value.toString());
    setFrequency(contract.frequency);
    setStatus(contract.status);
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setNotes(contract.notes || "");
  }

  if (!contract) return null;

  const handleSubmit = () => {
    toast({ title: "Contrato atualizado", description: `${name} salvo com sucesso.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
          <p className="text-xs font-mono text-muted-foreground">{contract.id}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nome do Contrato</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(contractTypeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(contractStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={value} onChange={e => setValue(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                  <SelectItem value="one-time">Único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Término</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
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

export default EditContractDialog;
