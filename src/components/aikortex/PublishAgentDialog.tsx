import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import AgentDiffView from "./AgentDiffView";
import { usePublishAgent } from "@/hooks/use-agent-versions";

import { evaluateReadiness } from "@/lib/agent-readiness";

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
