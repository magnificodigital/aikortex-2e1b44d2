import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agentId: string;
  agentName: string;
  onPublished?: () => void;
}

function formatCpfCnpj(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function formatPhone(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/**
 * Diferente do PublishAgentDialog.tsx (que publica uma VERSÃO do config).
 * Este aqui PUBLICA PRO CLIENTE FINAL — ativa cobrança recorrente via Asaas
 * Subscription com split. Master v7.4 §3.
 */
export default function PublishForClientDialog({ open, onOpenChange, agentId, agentName, onPublished }: Props) {
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(""); setCpfCnpj(""); setEmail(""); setPhone("");
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const canSubmit = name.trim().length >= 3
    && cpfCnpj.replace(/\D/g, "").length >= 11
    && /\S+@\S+\.\S+/.test(email)
    && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-agent-subscribe", {
        body: {
          agent_id: agentId,
          client_info: {
            name: name.trim(),
            cpf_cnpj: cpfCnpj.replace(/\D/g, ""),
            email: email.trim(),
            phone: phone.replace(/\D/g, ""),
          },
        },
      });

      if (error || (data as any)?.error) {
        const msg = (data as any)?.message
          || (error as Error)?.message
          || "Falha ao publicar agente";
        toast.error(msg, { duration: 8000 });
        setSubmitting(false);
        return;
      }

      const d = data as { agency_percent: number; platform_percent: number; retail_price_cents: number; next_due_date: string };
      toast.success(
        `Agente publicado! ${d.agency_percent}% pra você, ${d.platform_percent}% pra Aikortex. ` +
        `Primeira cobrança em ${new Date(d.next_due_date).toLocaleDateString("pt-BR")}.`,
        { duration: 8000 },
      );
      onPublished?.();
      handleClose(false);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Publicar pro cliente final
          </DialogTitle>
          <DialogDescription>
            Ativa a cobrança recorrente do cliente final via Asaas para o agente <strong>{agentName}</strong>.
            Sua parte cai direto na tua wallet via split nativo (sem reconciliação manual).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200/80">
              Pré-requisito: tua wallet Asaas precisa estar configurada em <strong>Configurações → Financeiro</strong>.
              É pra lá que o Asaas vai mandar tua parte da venda.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome ou razão social do cliente</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Loja Roupas XYZ Ltda" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">CPF ou CNPJ</Label>
            <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Email do cliente</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com.br" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Telefone (opcional)</Label>
            <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 98765-4321" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Publicar e iniciar cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
