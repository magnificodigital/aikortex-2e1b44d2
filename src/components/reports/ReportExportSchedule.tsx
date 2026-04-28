import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Table2, FileSpreadsheet, Clock, Mail, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportDialog = ({ open, onOpenChange }: ExportDialogProps) => {
  const [format, setFormat] = useState("pdf");

  const handleExport = () => {
    const formatLabels: Record<string, string> = { pdf: "PDF", csv: "CSV", xlsx: "Excel" };
    toast({ title: `Relatório exportado em ${formatLabels[format]}`, description: "Download iniciado." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Formato</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {[
                { key: "pdf", label: "PDF", icon: FileText, desc: "Documento formatado" },
                { key: "csv", label: "CSV", icon: Table2, desc: "Dados tabulares" },
                { key: "xlsx", label: "Excel", icon: FileSpreadsheet, desc: "Planilha editável" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                    format === f.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <f.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  email: string;
  nextRun: string;
}

export const ScheduleDialog = ({ open, onOpenChange }: ScheduleDialogProps) => {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [email, setEmail] = useState("");
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([
    { id: "sr1", name: "Relatório Financeiro Semanal", frequency: "weekly", email: "admin@agency.com", nextRun: "2026-03-16" },
    { id: "sr2", name: "Performance Mensal da Equipe", frequency: "monthly", email: "admin@agency.com", nextRun: "2026-04-01" },
  ]);

  const handleCreate = () => {
    if (!name || !email) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    const newReport: ScheduledReport = {
      id: `sr-${Date.now()}`,
      name,
      frequency,
      email,
      nextRun: frequency === "weekly" ? "2026-03-16" : "2026-04-01",
    };
    setScheduled(prev => [...prev, newReport]);
    toast({ title: "Relatório agendado!", description: `${name} será enviado ${frequency === "weekly" ? "semanalmente" : "mensalmente"}` });
    setName("");
    setEmail("");
  };

  const handleDelete = (id: string) => {
    setScheduled(prev => prev.filter(r => r.id !== id));
    toast({ title: "Agendamento removido" });
  };

  const freqLabels: Record<string, string> = { weekly: "Semanal", monthly: "Mensal" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Relatórios Agendados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Existing scheduled reports */}
          {scheduled.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agendamentos Ativos</Label>
              {scheduled.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <div className="text-sm font-medium text-foreground">{r.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{freqLabels[r.frequency]}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.email}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* New schedule form */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Novo Agendamento</Label>
            <div>
              <Label className="text-xs">Nome do Relatório</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Resumo Financeiro Semanal" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Email de envio</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" className="mt-1" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleCreate} className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
