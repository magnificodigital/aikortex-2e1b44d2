import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Send, FileText, Calendar, DollarSign, User, Paperclip, Clock } from "lucide-react";
import { Contract, contractStatusConfig, contractTypeConfig, frequencyLabels } from "@/types/contract";
import { toast } from "@/hooks/use-toast";

interface ContractDetailDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const lifecycle = [
  { key: "draft", label: "Rascunho" },
  { key: "pending_signature", label: "Enviado" },
  { key: "active", label: "Ativo" },
  { key: "expired", label: "Expirado" },
];

const ContractDetailDialog = ({ contract, open, onOpenChange }: ContractDetailDialogProps) => {
  if (!contract) return null;
  const sCfg = contractStatusConfig[contract.status];
  const currentIdx = lifecycle.findIndex(l => l.key === contract.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{contract.name}</span>
            <Badge variant="secondary" className={`text-[10px] ${sCfg.color}`}>{sCfg.label}</Badge>
          </DialogTitle>
          <p className="text-xs font-mono text-muted-foreground">{contract.id}</p>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="lifecycle">Ciclo de Vida</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">{contract.client}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium text-foreground">{contractTypeConfig[contract.type].label}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-bold text-foreground text-lg">R$ {contract.value.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-muted-foreground">{frequencyLabels[contract.frequency]}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Vigência</p>
                  <p className="text-foreground">{new Date(contract.startDate).toLocaleDateString("pt-BR")} — {new Date(contract.endDate).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              {contract.signedDate && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assinado em</p>
                    <p className="text-foreground">{new Date(contract.signedDate).toLocaleDateString("pt-BR")}</p>
                    {contract.signedBy && <p className="text-[10px] text-muted-foreground">por {contract.signedBy}</p>}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Anexos</p>
                  <p className="text-foreground">{contract.attachments} arquivo(s)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => toast({ title: "PDF gerado" })}>
                <Download className="w-3.5 h-3.5 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => toast({ title: "Contrato enviado" })}>
                <Send className="w-3.5 h-3.5 mr-1" /> Enviar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="lifecycle" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Progresso do contrato no ciclo de vida</p>
              <div className="flex items-center gap-2">
                {lifecycle.map((step, i) => {
                  const isCompleted = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={step.key} className="flex items-center gap-2 flex-1">
                      <div className={`flex flex-col items-center flex-1 ${isCurrent ? "scale-105" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {i + 1}
                        </div>
                        <span className={`text-[10px] mt-1 text-center ${isCurrent ? "font-bold text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                      </div>
                      {i < lifecycle.length - 1 && (
                        <div className={`h-0.5 flex-1 ${isCompleted && i < currentIdx ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground">HISTÓRICO</h4>
                {contract.signedDate && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] mt-1.5" />
                    <div>
                      <p className="text-foreground">Contrato assinado por {contract.signedBy}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(contract.signedDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="text-foreground">Contrato criado</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(contract.startDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">SERVIÇOS INCLUÍDOS</h4>
              <div className="flex flex-wrap gap-2">
                {contract.services.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailDialog;
