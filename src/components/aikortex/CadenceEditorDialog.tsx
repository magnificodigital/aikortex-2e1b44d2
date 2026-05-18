import { useState } from "react";
import { Clock, Plus, Trash2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCreateCadence, useUpdateCadence } from "@/hooks/use-agent-cadences";
import {
  type AgentCadence,
  type CadenceStep,
  makeEmptyStep,
  sortStepsChronologically,
  formatStepDelay,
} from "@/types/agent-cadences";

// Substitui placeholders {chave} usando o meta fornecido (espelha o engine do servidor).
function renderTemplate(tpl: string, meta: Record<string, any>): string {
  return (tpl ?? "").replace(/\{(\w+)\}/g, (_, k) => (meta?.[k] ?? `{${k}}`));
}

// Contato de exemplo usado pra preview no editor.
const PREVIEW_CONTACT: Record<string, string> = {
  nome: "Maria Silva",
  name: "Maria Silva",
  telefone: "(11) 99999-9999",
  email: "maria@exemplo.com",
};

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  cadence?: AgentCadence | null;
}

const MAX_STEPS = 20;

export default function CadenceEditorDialog({ open, onOpenChange, agentId, cadence }: Props) {
  const isEdit = !!cadence;
  const [name, setName] = useState(cadence?.name ?? "");
  const [description, setDescription] = useState(cadence?.description ?? "");
  const [triggerType, setTriggerType] = useState<"manual" | "auto">(cadence?.trigger_type ?? "manual");
  const [steps, setSteps] = useState<CadenceStep[]>(
    cadence?.steps?.length ? cadence.steps : [makeEmptyStep()]
  );

  const create = useCreateCadence();
  const update = useUpdateCadence();

  const updateStep = (idx: number, patch: Partial<CadenceStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    if (steps.length >= MAX_STEPS) {
      toast.error(`Máximo de ${MAX_STEPS} steps`);
      return;
    }
    // Default new step adds 1 day to the previous delay
    const last = steps[steps.length - 1];
    const next = makeEmptyStep();
    next.day = Math.min(365, (last?.day ?? 0) + 1);
    next.hour = last?.hour ?? 0;
    next.minute = last?.minute ?? 0;
    next.channel = last?.channel ?? "email";
    setSteps((prev) => [...prev, next]);
  };

  const removeStep = (idx: number) => {
    if (steps.length === 1) {
      toast.error("Cadência precisa ter ao menos 1 step");
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Nome é obrigatório";
    if (steps.length === 0) return "Adicione ao menos 1 step";
    if (steps.length > MAX_STEPS) return `Máximo ${MAX_STEPS} steps`;
    for (const [i, s] of steps.entries()) {
      const n = i + 1;
      if (s.day < 0 || s.day > 365) return `Step ${n}: dia entre 0 e 365`;
      if (s.hour < 0 || s.hour > 23) return `Step ${n}: hora entre 0 e 23`;
      if (s.minute < 0 || s.minute > 59) return `Step ${n}: minuto entre 0 e 59`;
      const msg = (s.message_template ?? "").trim();
      if (msg.length < 1) return `Step ${n}: mensagem obrigatória`;
      if (msg.length > 1000) return `Step ${n}: mensagem até 1000 caracteres`;
      if (s.channel === "email") {
        const subj = (s.subject_template ?? "").trim();
        if (subj.length > 200) return `Step ${n}: assunto até 200 caracteres`;
        const fn = (s.from_name ?? "").trim();
        if (fn.length > 60) return `Step ${n}: nome do remetente até 60 caracteres`;
        const rt = (s.reply_to ?? "").trim();
        if (rt && !EMAIL_RE.test(rt)) return `Step ${n}: reply-to inválido`;
      }
      const placeholders = Array.from(new Set((msg.match(/\{[^}]+\}/g) ?? [])));
      if (placeholders.length > 10) return `Step ${n}: máximo 10 placeholders distintos`;
    }
    return null;
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const ordered = sortStepsChronologically(steps);
    try {
      if (isEdit && cadence) {
        await update.mutateAsync({
          id: cadence.id,
          agent_id: agentId,
          name: name.trim(),
          description: description.trim() || null,
          steps: ordered,
          trigger_type: triggerType,
        });
      } else {
        await create.mutateAsync({
          agent_id: agentId,
          name: name.trim(),
          description: description.trim() || null,
          steps: ordered,
          trigger_type: triggerType,
          enabled: true,
        });
      }
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {isEdit ? "Editar cadência" : "Nova cadência"}
          </DialogTitle>
          <DialogDescription>
            Defina uma sequência temporal de mensagens. Steps são executados em ordem cronológica.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cad-name">Nome *</Label>
                <Input
                  id="cad-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Onboarding Pacientes"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trigger</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (agência inicia)</SelectItem>
                    <SelectItem value="auto" disabled>Automático (em breve)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cad-desc">Descrição</Label>
              <Textarea
                id="cad-desc"
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Para que serve essa cadência?"
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Steps ({steps.length})</p>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={addStep} type="button">
                  <Plus className="w-3.5 h-3.5" /> Adicionar step
                </Button>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                {steps.map((s, idx) => (
                  <div key={s.id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">Step {idx + 1}</Badge>
                        <span className="text-[10px] text-muted-foreground">{formatStepDelay(s)} do início</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeStep(idx)}
                        type="button"
                        title="Remover step"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Aguardar desde o início da cadência</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            value={s.day}
                            onChange={(e) => updateStep(idx, { day: Math.max(0, Math.min(365, parseInt(e.target.value || "0", 10))) })}
                            className="h-8"
                          />
                          <p className="text-[9px] text-muted-foreground text-center">dias</p>
                        </div>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={s.hour}
                            onChange={(e) => updateStep(idx, { hour: Math.max(0, Math.min(23, parseInt(e.target.value || "0", 10))) })}
                            className="h-8"
                          />
                          <p className="text-[9px] text-muted-foreground text-center">horas</p>
                        </div>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            value={s.minute}
                            onChange={(e) => updateStep(idx, { minute: Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10))) })}
                            className="h-8"
                          />
                          <p className="text-[9px] text-muted-foreground text-center">min</p>
                        </div>
                        <div className="space-y-1">
                          <Select value={s.channel} onValueChange={(v) => updateStep(idx, { channel: v as any })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp" disabled>WhatsApp (em breve)</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms" disabled>SMS (em breve)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[9px] text-muted-foreground text-center">canal</p>
                        </div>
                      </div>
                    </div>

                    {s.channel === "email" && (
                      <div className="space-y-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-primary" />
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">Configurações de email</p>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Assunto</Label>
                          <Input
                            value={s.subject_template ?? ""}
                            onChange={(e) => updateStep(idx, { subject_template: e.target.value })}
                            placeholder="Ex: Olá {nome}, sua consulta foi confirmada"
                            maxLength={200}
                            className="h-8 text-xs"
                          />
                          <p className="text-[9px] text-muted-foreground">
                            Suporta placeholders. Se vazio, usa nome da cadência + número da mensagem.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Nome do remetente</Label>
                            <Input
                              value={s.from_name ?? ""}
                              onChange={(e) => updateStep(idx, { from_name: e.target.value })}
                              placeholder="Ex: Clínica São Paulo"
                              maxLength={60}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Responder para (opcional)</Label>
                            <Input
                              type="email"
                              value={s.reply_to ?? ""}
                              onChange={(e) => updateStep(idx, { reply_to: e.target.value })}
                              placeholder="contato@suaempresa.com"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Mensagem</Label>
                      <Textarea
                        value={s.message_template}
                        onChange={(e) => updateStep(idx, { message_template: e.target.value })}
                        placeholder="Olá {nome}! Bem-vindo..."
                        rows={3}
                        maxLength={1000}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Placeholders: <code>{"{nome}"}</code>, <code>{"{telefone}"}</code>, <code>{"{email}"}</code> ou qualquer coluna da tabela do cliente.
                      </p>
                    </div>

                    {s.channel === "email" && (s.message_template?.trim() || s.subject_template?.trim()) && (
                      <div className="rounded-md border border-dashed border-border bg-muted/20 p-2.5 space-y-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Preview (com contato de exemplo)</p>
                        <div className="space-y-0.5 text-[11px]">
                          <p>
                            <span className="text-muted-foreground">De: </span>
                            <span className="font-medium">{(s.from_name ?? "").trim() || "(sem nome)"} </span>
                            <span className="text-muted-foreground">&lt;contato@...&gt;</span>
                          </p>
                          {(s.reply_to ?? "").trim() && (
                            <p>
                              <span className="text-muted-foreground">Reply-to: </span>
                              <span className="font-medium">{s.reply_to}</span>
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">Assunto: </span>
                            <span className="font-medium">
                              {renderTemplate(s.subject_template?.trim() || `${name || "Cadência"} — Mensagem ${idx + 1}`, PREVIEW_CONTACT)}
                            </span>
                          </p>
                        </div>
                        <div className="border-t border-border/50 pt-1.5">
                          <pre className="whitespace-pre-wrap font-sans text-[11px] text-foreground/90 leading-relaxed">
{renderTemplate(s.message_template || "", PREVIEW_CONTACT)}

— — —
Você está recebendo este email porque consta em uma lista de contatos gerenciada por {(s.from_name ?? "").trim() || "este remetente"}.
Para parar de receber, clique aqui: [link gerado automaticamente]
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar cadência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
