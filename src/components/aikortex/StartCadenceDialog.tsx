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
import type { AgentCadence } from "@/types/agent-cadences";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  cadence: AgentCadence;
}

function computeNextRunAt(step: { day: number; hour: number; minute: number } | undefined): string {
  const base = new Date();
  const d = step?.day ?? 0;
  const h = step?.hour ?? 9;
  const m = step?.minute ?? 0;
  base.setDate(base.getDate() + d);
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function previewDateLabel(idx: number, step: { day: number; hour: number; minute: number }): string {
  const d = new Date();
  d.setDate(d.getDate() + step.day);
  d.setHours(step.hour, step.minute, 0, 0);
  const dayLabel = idx === 0 && step.day === 0 ? "hoje" : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return `${dayLabel} ${String(step.hour).padStart(2, "0")}:${String(step.minute).padStart(2, "0")}`;
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

  const schedule = useScheduleCadenceExecution();

  const contact = useMemo(() => {
    if (source === "manual") {
      return { name: manualName.trim(), phone: manualPhone.trim(), metadata: {} as Record<string, any> };
    }
    const row = rowsData?.rows.find((r) => r.id === selectedRowId);
    if (!row) return { name: "", phone: "", metadata: {} };
    const data = (row.data ?? {}) as Record<string, any>;
    const name =
      data.nome || data.name || data.full_name || data.cliente || data.contato || "";
    const phone =
      data.telefone || data.phone || data.celular || data.whatsapp || "";
    return { name: String(name || ""), phone: String(phone || ""), metadata: data };
  }, [source, manualName, manualPhone, rowsData, selectedRowId]);

  const onConfirm = async () => {
    if (!contact.name && !contact.phone) {
      toast.error("Selecione ou informe um contato");
      return;
    }
    if (!cadence.steps?.length) {
      toast.error("Cadência sem steps");
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={manualName} onChange={(e) => setManualName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} className="h-9" placeholder="+5511..." />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
            <p className="text-xs font-medium text-foreground">Visualização da cadência</p>
            {cadence.steps.map((s, i) => (
              <p key={s.id} className="text-[11px] text-muted-foreground font-mono truncate">
                Dia {s.day} ({previewDateLabel(i, s)}): "{(s.message_template || "").slice(0, 50)}{s.message_template.length > 50 ? "..." : ""}"
              </p>
            ))}
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Engine de execução estará disponível no próximo sprint. Por enquanto, a cadência fica agendada mas não envia mensagens automáticas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={schedule.isPending}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={schedule.isPending}>
            {schedule.isPending ? "Agendando..." : "Agendar cadência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
