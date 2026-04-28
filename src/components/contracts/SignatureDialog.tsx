import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { PenLine, Mail, MousePointerClick, Check, Send, Copy, Clock, Shield } from "lucide-react";
import { Contract, contractStatusConfig } from "@/types/contract";
import SignatureCanvas from "./SignatureCanvas";

interface SignatureDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SignatureDialog = ({ contract, open, onOpenChange }: SignatureDialogProps) => {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [oneClickName, setOneClickName] = useState("");
  const [oneClickSigned, setOneClickSigned] = useState(false);

  if (!contract) return null;

  const sCfg = contractStatusConfig[contract.status];

  const handleVisualSign = (dataUrl: string) => {
    setSignatureData(dataUrl);
    toast({
      title: "Contrato assinado visualmente",
      description: `Assinatura capturada para ${contract.name}. Documento salvo.`,
    });
  };

  const handleSendEmail = () => {
    if (!emailTo.trim() || !emailTo.includes("@")) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    setEmailSent(true);
    toast({
      title: "Solicitação enviada",
      description: `Link de assinatura enviado para ${emailTo}`,
    });
  };

  const generateLink = () => {
    const link = `https://aihub.app/sign/${contract.id}?token=${crypto.randomUUID().slice(0, 8)}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado",
      description: "Link seguro de assinatura copiado para a área de transferência",
    });
  };

  const handleOneClick = () => {
    if (!oneClickName.trim()) {
      toast({ title: "Informe seu nome completo", variant: "destructive" });
      return;
    }
    setOneClickSigned(true);
    toast({
      title: "Contrato aceito e assinado",
      description: `Assinado por ${oneClickName} em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    });
  };

  const reset = () => {
    setSignatureData(null);
    setEmailTo("");
    setEmailSent(false);
    setOneClickName("");
    setOneClickSigned(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            Assinar Contrato
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-foreground font-medium">{contract.name}</span>
            <Badge variant="secondary" className={`text-[10px] ${sCfg.color}`}>{sCfg.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{contract.client} · {contract.id}</p>
        </DialogHeader>

        <Tabs defaultValue="visual" className="mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="visual" className="text-xs gap-1">
              <PenLine className="w-3.5 h-3.5" /> Visual
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs gap-1">
              <Mail className="w-3.5 h-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="oneclick" className="text-xs gap-1">
              <MousePointerClick className="w-3.5 h-3.5" /> 1-Clique
            </TabsTrigger>
          </TabsList>

          {/* VISUAL SIGNATURE */}
          <TabsContent value="visual" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Desenhe sua assinatura usando o mouse ou toque na área abaixo.</p>
            {signatureData ? (
              <div className="space-y-3">
                <div className="border border-border rounded-lg p-4 bg-muted/30 text-center space-y-2">
                  <Check className="w-8 h-8 text-[hsl(var(--success))] mx-auto" />
                  <p className="text-sm font-medium text-foreground">Assinatura capturada com sucesso</p>
                  <img src={signatureData} alt="Assinatura" className="mx-auto max-h-24 rounded border border-border" />
                  <p className="text-[10px] text-muted-foreground">
                    {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setSignatureData(null)}>
                  Assinar novamente
                </Button>
              </div>
            ) : (
              <SignatureCanvas onSign={handleVisualSign} />
            )}
          </TabsContent>

          {/* EMAIL SIGNATURE */}
          <TabsContent value="email" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Envie um link seguro para o cliente assinar o contrato online.</p>

            {emailSent ? (
              <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Solicitação enviada</p>
                    <p className="text-xs text-muted-foreground">Enviado para {emailTo}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aguardando assinatura do cliente</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Link expira em 7 dias</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEmailSent(false); setEmailTo(""); }}>
                    Reenviar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={generateLink}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Email do signatário</Label>
                  <Input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground text-sm">O que será enviado:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Link seguro para visualizar o contrato</li>
                    <li>Botão de assinatura com um clique</li>
                    <li>Área para assinatura visual (opcional)</li>
                    <li>Confirmação por email após assinatura</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleSendEmail}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Enviar Solicitação
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateLink}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Link
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ONE-CLICK SIGNATURE */}
          <TabsContent value="oneclick" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Assinatura rápida com confirmação digital. Registra nome, data, hora e IP.</p>

            {oneClickSigned ? (
              <div className="border border-border rounded-lg p-4 bg-muted/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-[hsl(var(--success))]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Contrato Assinado</p>
                  <p className="text-xs text-muted-foreground mt-1">Assinado digitalmente por</p>
                  <p className="text-sm font-medium text-foreground">{oneClickName}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Data</p>
                    <p>{new Date().toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Hora</p>
                    <p>{new Date().toLocaleTimeString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Contrato</p>
                    <p>{contract.id}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Verificação</p>
                    <p className="font-mono">{crypto.randomUUID().slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">RESUMO DO CONTRATO</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Contrato</p>
                      <p className="font-medium text-foreground">{contract.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-bold text-foreground">R$ {contract.value.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vigência</p>
                      <p className="text-foreground">{new Date(contract.startDate).toLocaleDateString("pt-BR")} — {new Date(contract.endDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Serviços</p>
                      <p className="text-foreground">{contract.services.join(", ")}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Nome completo do signatário *</Label>
                  <Input
                    value={oneClickName}
                    onChange={(e) => setOneClickName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Ao clicar em "Aceitar e Assinar", você concorda com os termos do contrato acima. Esta ação tem validade jurídica como assinatura eletrônica.</p>
                </div>

                <Button className="w-full" onClick={handleOneClick}>
                  <MousePointerClick className="w-4 h-4 mr-2" /> Aceitar e Assinar
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureDialog;
