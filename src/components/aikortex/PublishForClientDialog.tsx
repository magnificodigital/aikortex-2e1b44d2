import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_PRICE_CENTS = 99700;

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
  const [priceCents, setPriceCents] = useState<number>(DEFAULT_PRICE_CENTS);

  // Carrega preco do template do agente (ou usa default). So roda quando o
  // dialog abre — evita query desnecessaria em mount.
  useEffect(() => {
    if (!open || !agentId) return;
    let cancelled = false;
    (async () => {
      const { data: agent } = await supabase
        .from("user_agents")
        .select("template_id")
        .eq("id", agentId)
        .maybeSingle();
      const tplId = (agent as any)?.template_id;
      if (!tplId || cancelled) return;
      const { data: tpl } = await supabase
        .from("agent_templates")
        .select("retail_price_cents")
        .eq("id", tplId)
        .maybeSingle();
      if (!cancelled && (tpl as any)?.retail_price_cents) {
        setPriceCents((tpl as any).retail_price_cents);
      }
    })();
    return () => { cancelled = true; };
  }, [open, agentId]);

  const priceFmt = (priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
            Publicar {agentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-border bg-primary/5 p-4">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wider">Mensalidade</p>
            <p className="text-2xl font-bold text-foreground">
              {priceFmt}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>

          <div className="space-y-3">
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
