import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GitBranch, RotateCcw, Eye, Pencil, Check, Zap } from "lucide-react";
import { useAgentVersions, useAgentPublishState, useRestoreAgentVersion, useUpdateVersionLabel, type AgentVersion } from "@/hooks/use-agent-versions";
import AgentDiffView from "./AgentDiffView";
import { Input } from "@/components/ui/input";
import { computeAgentDiff } from "@/lib/agent-diff";

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR }); } catch { return ""; }
}

export default function AgentVersionsSection({ agentId }: { agentId?: string }) {
  const versionsQ = useAgentVersions(agentId);
  const stateQ = useAgentPublishState(agentId);
  const restore = useRestoreAgentVersion();
  const updateLabel = useUpdateVersionLabel();
  const [diffOf, setDiffOf] = useState<{ from: AgentVersion | null; to: AgentVersion | "draft" } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AgentVersion | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  if (!agentId) {
    return <p className="text-sm text-muted-foreground">Salve o agente antes de gerenciar versões.</p>;
  }

  const versions = versionsQ.data ?? [];
  const state = stateQ.data;
  const publishedId = state?.publishedVersionId;
  const draftChanges = state ? computeAgentDiff(state.publishedSnapshot, state.currentConfig) : [];
  const draftHasChanges = draftChanges.length > 0;

  const sortedVersions = useMemo(() => [...versions].sort((a, b) => b.version_number - a.version_number), [versions]);
  const findPrev = (v: AgentVersion) => {
    const idx = sortedVersions.findIndex(x => x.id === v.id);
    return idx >= 0 && idx + 1 < sortedVersions.length ? sortedVersions[idx + 1] : null;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><GitBranch className="w-4 h-4" /> Versões</h2>
        <p className="text-sm text-muted-foreground mt-1">Histórico de versões publicadas do agente.</p>
      </div>

      {/* Rascunho atual */}
      {(draftHasChanges || versions.length === 0) && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold">Rascunho atual</p>
            {draftHasChanges && <Badge variant="secondary" className="text-[10px]">{draftChanges.length} alterações</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {state?.draftUpdatedAt ? `Última edição ${timeAgo(state.draftUpdatedAt)}` : "Sem edições registradas"}
          </p>
          {publishedId && draftHasChanges && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {
              const pub = versions.find(v => v.id === publishedId) ?? null;
              setDiffOf({ from: pub, to: "draft" });
            }}>
              Ver diff vs v{state?.publishedNumber} →
            </Button>
          )}
        </div>
      )}

      {/* Lista de versões */}
      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma versão publicada ainda. Use o botão "Publicar" no topo.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => {
            const isPublished = v.id === publishedId;
            const prev = findPrev(v);
            return (
              <div key={v.id} className={`rounded-lg border p-3 space-y-1 ${isPublished ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isPublished && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    <p className="text-sm font-semibold">v{v.version_number}</p>
                    {isPublished && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">em produção</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setDiffOf({ from: prev, to: v })}>
                      <Eye className="w-3 h-3" /> Diff{prev ? ` vs v${prev.version_number}` : ""}
                    </Button>
                    {!isPublished && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setRestoreTarget(v)}>
                        <RotateCcw className="w-3 h-3" /> Restaurar
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Publicada {timeAgo(v.created_at)}</p>
                <div className="flex items-center gap-2">
                  {editingId === v.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Nome da versão"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => {
                        await updateLabel.mutateAsync({ versionId: v.id, agentId, label: editLabel.trim() || null });
                        setEditingId(null);
                      }}>
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-foreground italic flex-1">{v.label || <span className="text-muted-foreground">sem nome</span>}</p>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingId(v.id); setEditLabel(v.label || ""); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
                {v.notes && <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{v.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Diff dialog */}
      <Dialog open={!!diffOf} onOpenChange={(o) => !o && setDiffOf(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Diff:{" "}
              {diffOf?.from ? `v${diffOf.from.version_number}` : "—"}
              {" → "}
              {diffOf?.to === "draft" ? "rascunho" : diffOf?.to ? `v${(diffOf.to as AgentVersion).version_number}` : ""}
            </DialogTitle>
          </DialogHeader>
          {diffOf && (
            <AgentDiffView
              before={diffOf.from?.config_snapshot ?? null}
              after={diffOf.to === "draft" ? state?.currentConfig ?? null : (diffOf.to as AgentVersion).config_snapshot}
              fromLabel={diffOf.from ? `v${diffOf.from.version_number}` : "vazio"}
              toLabel={diffOf.to === "draft" ? "rascunho" : `v${(diffOf.to as AgentVersion).version_number}`}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurar v{restoreTarget?.version_number} vai substituir o rascunho atual. A versão em produção continua intacta até você publicar de novo. Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (restoreTarget) await restore.mutateAsync({ agentId, version: restoreTarget });
              setRestoreTarget(null);
            }}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
