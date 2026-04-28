import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CallState = "idle" | "initiating" | "ringing" | "in_progress" | "ended" | "failed";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  hasTelnyxKey: boolean;
}

const STATE_LABELS: Record<CallState, string> = {
  idle: "Pronto",
  initiating: "Iniciando...",
  ringing: "Discando...",
  in_progress: "Em andamento",
  ended: "Encerrado",
  failed: "Falhou",
};

const OutboundCallDialog = ({ open, onOpenChange, agentId, agentName, hasTelnyxKey }: Props) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callState, setCallState] = useState<CallState>("idle");

  useEffect(() => {
    if (open) {
      setCallState("idle");
      setPhoneNumber("");
    }
  }, [open]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  };

  const handleCall = async () => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Número de telefone inválido.");
      return;
    }

    setCallState("initiating");
    try {
      const { data, error } = await supabase.functions.invoke("telnyx-outbound", {
        body: { agent_id: agentId, phone_to: `+${digits}` },
      });

      if (error) {
        const msg = typeof error === "object" && "message" in error ? (error as any).message : "Erro ao iniciar ligação";
        toast.error(msg);
        setCallState("failed");
        return;
      }

      if (data?.success) {
        setCallState("ringing");
        toast.success("Ligação iniciada!");
        // Simulated state transitions — in production, Telnyx webhook updates would be polled
        setTimeout(() => setCallState("in_progress"), 3000);
      } else {
        toast.error(data?.error?.message || data?.error || "Erro ao iniciar ligação");
        setCallState("failed");
      }
    } catch {
      toast.error("Erro de conexão.");
      setCallState("failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" /> Iniciar Ligação
          </DialogTitle>
        </DialogHeader>

        {!hasTelnyxKey ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
            <p className="text-sm font-medium">Telnyx não configurado</p>
            <p className="text-xs text-muted-foreground">
              Configure sua chave da Telnyx em Integrações para ativar ligações por telefone.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Agente</Label>
              <Input value={agentName} readOnly className="h-9 text-sm bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Número de destino</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                placeholder="+55 11 99999-9999"
                className="h-9 text-sm font-mono"
                disabled={callState !== "idle" && callState !== "failed" && callState !== "ended"}
              />
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`text-xs ${
                callState === "in_progress" ? "border-emerald-500/30 text-emerald-600" :
                callState === "ringing" || callState === "initiating" ? "border-yellow-500/30 text-yellow-600 animate-pulse" :
                callState === "failed" ? "border-destructive/30 text-destructive" :
                "border-border text-muted-foreground"
              }`}>
                {STATE_LABELS[callState]}
              </Badge>

              <Button
                onClick={handleCall}
                disabled={callState === "initiating" || callState === "ringing" || callState === "in_progress" || !phoneNumber.replace(/\D/g, "")}
                className="gap-2"
              >
                {callState === "initiating" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
                ) : (
                  <><Phone className="w-4 h-4" /> Ligar agora</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OutboundCallDialog;
