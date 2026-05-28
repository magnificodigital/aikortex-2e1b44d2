import { useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCreateCadence, useUpdateCadence } from "@/hooks/use-agent-cadences";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useAllAgencyClientTables } from "@/hooks/use-client-tables";
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
  const [autoTriggerTableId, setAutoTriggerTableId] = useState<string | null>(cadence?.auto_trigger_table_id ?? null);
  const [steps, setSteps] = useState<CadenceStep[]>(
    cadence?.steps?.length ? cadence.steps : [makeEmptyStep()]
  );

  const create = useCreateCadence();
  const update = useUpdateCadence();
  const { data: emailStatus } = useEmailIntegrationStatus();
  const { data: allTables = [] } = useAllAgencyClientTables();

  // Identidade do remetente vem da integração (Settings → Integrações → Email).
  // O preview mostra como vai chegar no inbox real.
  const senderName = emailStatus?.from_name?.trim() || (emailStatus?.connected ? "(sem nome configurado)" : "Aikortex (cortesia)");
  const senderEmail = emailStatus?.from_email || (emailStatus?.connected ? "" : "cortesia@sendmail.aikortex.com");
  const senderReplyTo = emailStatus?.reply_to?.trim() || "";

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
    if (triggerType === "auto" && !autoTriggerTableId) {
      return "Trigger automático: selecione uma tabela que vai disparar a cadência";
    }
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
      }
      if (s.channel === "whatsapp") {
        const tname = (s.whatsapp_template_name ?? "").trim();
        if (!tname) return `Step ${n}: nome do template WhatsApp é obrigatório`;
        if (!/^[a-z0-9_]+$/.test(tname)) return `Step ${n}: template name precisa ser lowercase, dígitos e underscore`;
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
    const triggerTableId = triggerType === "auto" ? autoTriggerTableId : null;
    try {
      if (isEdit && cadence) {
        await update.mutateAsync({
          id: cadence.id,
          agent_id: agentId,
          name: name.trim(),
          description: description.trim() || null,
          steps: ordered,
          trigger_type: triggerType,
          auto_trigger_table_id: triggerTableId,
        });
      } else {
        await create.mutateAsync({
          agent_id: agentId,
          name: name.trim(),
          description: description.trim() || null,
          steps: ordered,
          trigger_type: triggerType,
          enabled: true,
          auto_trigger_table_id: triggerTableId,
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
                <Select
                  value={triggerType}
                  onValueChange={(v) => {
                    const next = v as "manual" | "auto";
                    setTriggerType(next);
                    if (next === "manual") setAutoTriggerTableId(null);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (agência inicia)</SelectItem>
                    <SelectItem value="auto">Automático (ao inserir na tabela)</SelectItem>
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

            {triggerType === "auto" && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tabela que dispara essa cadência *</Label>
                  <Select
                    value={autoTriggerTableId ?? ""}
                    onValueChange={(v) => setAutoTriggerTableId(v || null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={allTables.length === 0 ? "Nenhuma tabela disponível" : "Escolha a tabela"} />
                    </SelectTrigger>
                    <SelectContent>
                      {allTables.length === 0 && (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                          Nenhuma tabela cadastrada. Crie uma em <strong>Clientes → [Cliente] → Tabelas</strong>.
                        </div>
                      )}
                      {allTables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="font-medium">{t.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">· {t.client_name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Toda vez que uma linha for inserida nessa tabela (manualmente ou via API/integração),
                  uma execução da cadência será criada automaticamente. O engine extrai{" "}
                  <code className="px-1 py-px rounded bg-muted/60">nome</code>,{" "}
                  <code className="px-1 py-px rounded bg-muted/60">email</code> e{" "}
                  <code className="px-1 py-px rounded bg-muted/60">telefone</code> da linha pra usar como contato.
                </p>
              </div>
            )}

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
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="sms" disabled>SMS (em breve)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[9px] text-muted-foreground text-center">canal</p>
                        </div>
                      </div>
                    </div>

                    {s.channel === "email" && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Assunto do email</Label>
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
                    )}

                    {s.channel === "whatsapp" && (
                      <div className="space-y-2 rounded-md border border-[#25D366]/30 bg-[#25D366]/5 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-[#25D366] font-semibold">Template WhatsApp (aprovado pela Meta)</p>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Nome do template *</Label>
                            <Input
                              value={s.whatsapp_template_name ?? ""}
                              onChange={(e) => updateStep(idx, { whatsapp_template_name: e.target.value })}
                              placeholder="ex: hello_world"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Idioma</Label>
                            <Input
                              value={s.whatsapp_template_language ?? "pt_BR"}
                              onChange={(e) => updateStep(idx, { whatsapp_template_language: e.target.value })}
                              placeholder="pt_BR"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">
                            Variáveis do template (ordem dos {"{{1}}, {{2}}..."})
                          </Label>
                          {(s.whatsapp_template_variables ?? []).map((v, vi) => (
                            <div key={vi} className="flex gap-1.5">
                              <span className="text-[10px] font-mono text-muted-foreground self-center w-6">{`{{${vi + 1}}}`}</span>
                              <Input
                                value={v}
                                onChange={(e) => {
                                  const next = [...(s.whatsapp_template_variables ?? [])];
                                  next[vi] = e.target.value;
                                  updateStep(idx, { whatsapp_template_variables: next });
                                }}
                                placeholder="Ex: {nome} ou texto fixo"
                                className="h-7 text-[11px]"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => {
                                  const next = (s.whatsapp_template_variables ?? []).filter((_, i) => i !== vi);
                                  updateStep(idx, { whatsapp_template_variables: next });
                                }}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => {
                              const next = [...(s.whatsapp_template_variables ?? []), ""];
                              updateStep(idx, { whatsapp_template_variables: next });
                            }}
                          >
                            <Plus className="w-3 h-3" /> Adicionar variável
                          </Button>
                          <p className="text-[9px] text-muted-foreground">
                            Cada variável aceita placeholders <code className="px-1 py-px rounded bg-muted/60">{"{nome}"}</code>,
                            <code className="px-1 py-px rounded bg-muted/60">{"{telefone}"}</code>, etc. ou texto fixo.
                          </p>
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
                            <span className="font-medium">{senderName} </span>
                            {senderEmail && <span className="text-muted-foreground">&lt;{senderEmail}&gt;</span>}
                          </p>
                          {senderReplyTo && (
                            <p>
                              <span className="text-muted-foreground">Reply-to: </span>
                              <span className="font-medium">{senderReplyTo}</span>
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
Você está recebendo este email porque consta em uma lista de contatos gerenciada por {senderName}.
Para parar de receber, clique aqui: [link gerado automaticamente]
                          </pre>
                        </div>
                        {!emailStatus?.connected && !emailStatus?.from_name && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 pt-1 border-t border-amber-500/20">
                            ⚠ Configure o nome do remetente em <strong>Settings → Integrações → Email</strong> pra personalizar como o email chega no inbox.
                          </p>
                        )}
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
