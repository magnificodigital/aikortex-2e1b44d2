import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { contractTypeConfig, mockTemplates, ContractTemplate } from "@/types/contract";

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const clients = ["TechFlow Corp", "Nova Digital", "Startup Hub", "MegaStore", "Fintech Plus", "EduTech", "DataVision"];

const NewContractDialog = ({ open, onOpenChange }: NewContractDialogProps) => {
  const [step, setStep] = useState<"template" | "form">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("");
  const [value, setValue] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectTemplate = (t: ContractTemplate) => {
    setSelectedTemplate(t);
    setName(t.name);
    setType(t.type);
    setValue(t.defaultValue.toString());
    setStep("form");
  };

  const startBlank = () => {
    setSelectedTemplate(null);
    setStep("form");
  };

  const reset = () => {
    setStep("template"); setSelectedTemplate(null);
    setName(""); setClient(""); setType(""); setValue(""); setFrequency(""); setStartDate(""); setEndDate(""); setNotes("");
  };

  const handleSubmit = () => {
    if (!name || !client || !value) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    toast({ title: "Contrato criado", description: `${name} para ${client}` });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "template" ? "Escolher Template" : "Novo Contrato"}</DialogTitle>
        </DialogHeader>

        {step === "template" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione um template ou comece do zero</p>
            <div className="grid grid-cols-1 gap-2">
              {mockTemplates.map(t => (
                <button key={t.id} onClick={() => selectTemplate(t)} className="glass-card rounded-lg p-3 text-left hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <Badge variant="outline" className="text-[10px]">{contractTypeConfig[t.type].label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  <p className="text-xs text-primary mt-1">R$ {t.defaultValue.toLocaleString("pt-BR")} · {t.defaultDuration} meses</p>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={startBlank}>Contrato em branco</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="text-[10px] text-muted-foreground">Template: {selectedTemplate.name}</div>
            )}
            <div>
              <Label className="text-xs">Nome do Contrato *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Automação IA - Cliente" />
            </div>
            <div>
              <Label className="text-xs">Cliente *</Label>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(contractTypeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue placeholder="Frequência" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="one-time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" />
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
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." rows={3} />
            </div>
          </div>
        )}

        {step === "form" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("template")}>Voltar</Button>
            <Button onClick={handleSubmit}>Criar Contrato</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewContractDialog;
