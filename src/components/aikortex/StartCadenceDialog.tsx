import { useMemo, useState } from "react";
import { Calendar, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useScheduleCadenceExecution } from "@/hooks/use-agent-cadences";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useActiveClient } from "@/hooks/use-active-client";
import { useClientTables, useClientTableRows } from "@/hooks/use-client-tables";
import { type AgentCadence, formatStepDelay, stepDelaySeconds } from "@/types/agent-cadences";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  cadence: AgentCadence;
}

function computeNextRunAt(step: { day: number; hour: number; minute: number } | undefined): string {
  const base = Date.now();
  const delaySec = step ? stepDelaySeconds(step) : 0;
  return new Date(base + delaySec * 1000).toISOString();
}

function previewDateLabel(step: { day: number; hour: number; minute: number }): string {
  const target = new Date(Date.now() + stepDelaySeconds(step) * 1000);
  return target.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

/** Strip básico de HTML pra preview legível na visualização da cadência. */
function stripHtmlForPreview(text: string): string {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export default function StartCadenceDialog({ open, onOpenChange, agentId, cadence }: Props) {
  const { activeClientId } = useActiveClient();
  const { data: tables = [] } = useClientTables(activeClientId);
  const [source, setSource] = useState<"table" | "manual">(tables.length > 0 ? "table" : "manual");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const { data: rowsData } = useClientTableRows(selectedTableId || null, { pageSize: 100 });
  const [selectedRowId, setSelectedRowId] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const schedule = useScheduleCadenceExecution();
  const { data: emailStatus } = useEmailIntegrationStatus();

  const hasEmailStep = (cadence.steps ?? []).some((s) => s.channel === "email");
  const hasWhatsappStep = (cadence.steps ?? []).some((s) => s.channel === "whatsapp");
  const emailBlocked = hasEmailStep && !emailStatus?.connected && (emailStatus?.trial_remaining ?? 0) === 0;

  const contact = useMemo(() => {
    if (source === "manual") {
      const metadata: Record<string, any> = {};
      const trimmedEmail = manualEmail.trim();
      if (trimmedEmail) metadata.email = trimmedEmail;
      return { name: manualName.trim(), phone: manualPhone.trim(), metadata };
    }
    const row = rowsData?.rows.find((r) => r.id === selectedRowId);
    if (!row) return { name: "", phone: "", metadata: {} };
    const data = (row.data ?? {}) as Record<string, any>;
    const name =
      data.nome || data.name || data.full_name || data.cliente || data.contato || "";
    const phone =
      data.telefone || data.phone || data.celular || data.whatsapp || "";
    return { name: String(name || ""), phone: String(phone || ""), metadata: data };
  }, [source, manualName, manualPhone, manualEmail, rowsData, selectedRowId]);

  const manualEmailInvalid = source === "manual" && manualEmail.trim().length > 0 && !EMAIL_RE.test(manualEmail.trim());

  const onConfirm = async () => {
    if (!contact.name && !contact.phone && !contact.metadata?.email) {
      toast.error("Informe ao menos nome, telefone ou email do contato");
      return;
    }
    if (!cadence.steps?.length) {
      toast.error("Cadência sem steps");
      return;
    }
    if (hasEmailStep) {
      const email = contact.metadata?.email || contact.metadata?.Email;
      if (!email || !EMAIL_RE.test(String(email))) {
        toast.error("Cadência tem step de email — informe um email válido");
        return;
      }
    }
    if (hasWhatsappStep && !contact.phone) {
      toast.error("Cadência tem step de WhatsApp — informe um telefone");
      return;
    }
    try {
      await schedule.mutateAsync({
        cadence_id: cadence.id,
        agent_id: agentId,
        contact_name: contact.name || null,
        contact_phone: contact.phone || null,
        contact_metadata: contact.metadata,
        total_steps: cadence.steps.length,
        next_run_at: computeNextRunAt(cadence.steps[0]),
      });
      onOpenChange(false);
    } catch {
      /* hook toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Iniciar cadência "{cadence.name}"
          </DialogTitle>
          <DialogDescription>Para qual contato você quer iniciar?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Origem do contato</Label>
            <RadioGroup value={source} onValueChange={(v) => setSource(v as any)} className="gap-1.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="table" id="src-table" disabled={tables.length === 0} />
                <span>Da tabela do cliente {tables.length === 0 && <span className="text-xs text-muted-foreground">(nenhuma tabela disponível)</span>}</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="manual" id="src-manual" />
                <span>Inserir manualmente</span>
              </label>
            </RadioGroup>
          </div>

          {source === "table" && tables.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tabela</Label>
                <Select value={selectedTableId} onValueChange={(v) => { setSelectedTableId(v); setSelectedRowId(""); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Escolher tabela" /></SelectTrigger>
                  <SelectContent>
                    {tables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contato</Label>
                <Select value={selectedRowId} onValueChange={setSelectedRowId} disabled={!selectedTableId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Escolher contato" /></SelectTrigger>
                  <SelectContent>
                    {(rowsData?.rows ?? []).map((r) => {
                      const data = (r.data ?? {}) as Record<string, any>;
                      const label = data.nome || data.name || data.cliente || `#${r.id.slice(0, 6)}`;
                      return <SelectItem key={r.id} value={r.id}>{String(label)}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {source === "manual" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} className="h-9" placeholder="Maria Silva" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Telefone {hasWhatsappStep && <span className="text-destructive">*</span>}
                  </Label>
                  <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} className="h-9" placeholder="+5511999999999" />
                </div>
              </div>
              {hasEmailStep && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="h-9"
                    placeholder="contato@exemplo.com"
                  />
                  {manualEmailInvalid && (
                    <p className="text-[11px] text-destructive">Formato de email inválido</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
            <p className="text-xs font-medium text-foreground">Visualização da cadência</p>
            {cadence.steps.map((s) => {
              const cleanText = stripHtmlForPreview(s.message_template || "");
              const truncated = cleanText.length > 60 ? `${cleanText.slice(0, 60)}…` : cleanText;
              return (
                <p key={s.id} className="text-[11px] text-muted-foreground font-mono truncate">
                  <span className="uppercase tracking-wider text-[9px] text-foreground/60">{s.channel}</span>{" "}
                  {formatStepDelay(s)} ({previewDateLabel(s)}): "{truncated}"
                </p>
              );
            })}
          </div>

          {emailBlocked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-[11px] text-destructive">
                Esta cadência contém steps de email, mas você não conectou o Resend e seu trial gratuito acabou.
                Acesse <strong>Configurações → Integrações → Email</strong> para conectar antes de iniciar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={schedule.isPending}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={schedule.isPending || emailBlocked || manualEmailInvalid}>
            {schedule.isPending ? "Agendando..." : "Iniciar cadência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
