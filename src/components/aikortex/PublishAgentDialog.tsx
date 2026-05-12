import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AgentDiffView from "./AgentDiffView";
import { usePublishAgent } from "@/hooks/use-agent-versions";

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
  const publish = usePublishAgent();

  const handleSubmit = async () => {
    await publish.mutateAsync({ agentId, label: label.trim() || undefined, notes: notes.trim() || undefined });
    setLabel("");
    setNotes("");
    setShowDetails(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar agente</DialogTitle>
          <DialogDescription>
            Você está publicando a versão {nextVersionNumber}. As próximas conversas usarão essa versão.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
          <Button onClick={handleSubmit} disabled={publish.isPending}>
            {publish.isPending ? "Publicando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
