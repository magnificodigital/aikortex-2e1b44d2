import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import AgentDiffView from "./AgentDiffView";
import { usePublishAgent } from "@/hooks/use-agent-versions";

interface ReadinessCheck {
  key: string;
  label: string;
  pass: boolean;
  /** "critical" bloqueia publicação. "recommended" só avisa */
  level: "critical" | "recommended";
  hint?: string;
}

/** Avalia o config do agente e retorna lista de checks. */
function evaluateReadiness(cfg: Record<string, any> | null): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];
  if (!cfg) return checks;

  const name = String(cfg.name ?? "").trim();
  const objective = String(cfg.objective ?? cfg.profile?.primaryGoal ?? "").trim();
  const instructions = String(cfg.instructions ?? cfg.profile?.instructions ?? "").trim();
  const tone = String(cfg.toneOfVoice ?? cfg.businessContext?.toneOfVoice ?? "").trim();
  const greeting = String(cfg.greetingMessage ?? cfg.businessContext?.greetingMessage ?? "").trim();
  const provider = String(cfg.provider ?? "").trim();
  const capabilities = cfg.capabilities ?? {};
  const hasAnyCapability = Object.values(capabilities).some((c: any) => c === true || c?.enabled === true);
  const channels = cfg.channels;
  const channelCount = Array.isArray(channels) ? channels.length : (channels && typeof channels === "object" ? Object.values(channels).filter((v) => v === true).length : 0);
  const guardrails = Array.isArray(cfg.guardrails) ? cfg.guardrails.length : 0;
  const tools = Array.isArray(cfg.enabledTools) ? cfg.enabledTools.length : 0;

  // ── Críticos ──
  checks.push({
    key: "name",
    label: "Nome do agente definido",
    pass: name.length >= 2,
    level: "critical",
  });
  checks.push({
    key: "objective",
    label: "Objetivo escrito",
    pass: objective.length >= 10,
    level: "critical",
    hint: !objective ? "Define em Agente → Cargo/Função" : undefined,
  });
  checks.push({
    key: "instructions",
    label: "Instruções do agente",
    pass: instructions.length >= 100,
    level: "critical",
    hint: instructions.length < 100 ? "Mínimo 100 caracteres em Agente → Instruções" : undefined,
  });
  const llmReady = !!provider && provider !== "aikortex" && provider !== "auto";
  checks.push({
    key: "llm",
    label: "Chave LLM real conectada (não Aikortex)",
    pass: llmReady,
    level: "critical",
    hint: !llmReady ? "Conecta OpenAI/Anthropic/Gemini em Integrações → LLMs" : undefined,
  });

  // ── Recomendados ──
  checks.push({
    key: "capability",
    label: "Pelo menos 1 capacidade cognitiva",
    pass: hasAnyCapability,
    level: "recommended",
    hint: !hasAnyCapability ? "Ative Raciocínio ou Memória em Capacidades" : undefined,
  });
  checks.push({
    key: "tone",
    label: "Tom de voz definido",
    pass: tone.length >= 3,
    level: "recommended",
  });
  checks.push({
    key: "greeting",
    label: "Mensagem de saudação",
    pass: greeting.length >= 10,
    level: "recommended",
    hint: !greeting ? "Define em Agente → Mensagem de saudação" : undefined,
  });
  checks.push({
    key: "channel",
    label: "Pelo menos 1 canal configurado",
    pass: channelCount > 0,
    level: "recommended",
    hint: channelCount === 0 ? "Conecta WhatsApp ou Email em Canais" : undefined,
  });
  checks.push({
    key: "guardrails",
    label: "Limites configurados",
    pass: guardrails > 0,
    level: "recommended",
    hint: guardrails === 0 ? "Marca em Capacidades → Limites o que NUNCA pode" : undefined,
  });
  checks.push({
    key: "tools",
    label: "Ferramentas habilitadas",
    pass: tools > 0,
    level: "recommended",
  });

  return checks;
}

export default function PublishAgentDialog({
  open,
  onOpenChange,
  agentId,
  nextVersionNumber,
  publishedSnapshot,
  currentConfig,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  nextVersionNumber: number;
  publishedSnapshot: Record<string, any> | null;
  currentConfig: Record<string, any> | null;
}) {
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [ackWarnings, setAckWarnings] = useState(false);
  const publish = usePublishAgent();

  const checks = useMemo(() => evaluateReadiness(currentConfig), [currentConfig]);
  const criticalFailing = checks.filter((c) => c.level === "critical" && !c.pass);
  const recommendedFailing = checks.filter((c) => c.level === "recommended" && !c.pass);
  const canPublish = criticalFailing.length === 0 && (recommendedFailing.length === 0 || ackWarnings);

  const handleSubmit = async () => {
    await publish.mutateAsync({ agentId, label: label.trim() || undefined, notes: notes.trim() || undefined });
    setLabel("");
    setNotes("");
    setShowDetails(false);
    setAckWarnings(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar agente</DialogTitle>
          <DialogDescription>
            Você está publicando a versão {nextVersionNumber}. As próximas conversas usarão essa versão.
          </DialogDescription>
        </DialogHeader>

        {/* Checklist de prontidão */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Prontidão pra produção
            {criticalFailing.length === 0 ? (
              <span className="text-[10px] font-normal text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                Pronto
              </span>
            ) : (
              <span className="text-[10px] font-normal text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                {criticalFailing.length} item{criticalFailing.length > 1 ? "s" : ""} bloqueando
              </span>
            )}
          </h4>
          <div className="space-y-1.5">
            {checks.map((c) => {
              const failed = !c.pass;
              const icon = c.pass ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : c.level === "critical" ? (
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              );
              return (
                <div
                  key={c.key}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md ${
                    failed && c.level === "critical"
                      ? "bg-destructive/5 border border-destructive/20"
                      : failed
                      ? "bg-amber-500/5 border border-amber-500/20"
                      : "bg-card/30 border border-border/40"
                  }`}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${c.pass ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                      {c.label}
                    </p>
                    {failed && c.hint && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.hint}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Acknowledgement de warnings recomendados */}
          {criticalFailing.length === 0 && recommendedFailing.length > 0 && (
            <label className="flex items-start gap-2 mt-2 px-2.5 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 cursor-pointer">
              <input
                type="checkbox"
                checked={ackWarnings}
                onChange={(e) => setAckWarnings(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs">
                Publicar mesmo assim — sei que {recommendedFailing.length} item{recommendedFailing.length > 1 ? "s" : ""} recomendado{recommendedFailing.length > 1 ? "s" : ""} {recommendedFailing.length > 1 ? "estão" : "está"} faltando
              </span>
            </label>
          )}
        </div>

        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Nome da versão (opcional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Ajuste no tom de voz" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Notas (opcional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="O que mudou nessa versão?" />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold">Resumo das alterações</p>
            <AgentDiffView
              before={publishedSnapshot}
              after={currentConfig}
              compact={!showDetails}
              fromLabel={publishedSnapshot ? `v${nextVersionNumber - 1}` : "vazio"}
              toLabel={`v${nextVersionNumber}`}
            />
            {!showDetails && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowDetails(true)}>
                Ver detalhes →
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publish.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={publish.isPending || !canPublish}>
            {publish.isPending ? "Publicando..." : criticalFailing.length > 0 ? `${criticalFailing.length} bloqueio${criticalFailing.length > 1 ? "s" : ""}` : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
