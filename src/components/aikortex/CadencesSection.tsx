import { useState } from "react";
import { Clock, Plus, Sparkles, Pencil, Trash2, Play, Pause, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RichEmptyState from "@/components/shared/RichEmptyState";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAgentCadences,
  useToggleCadence,
  useDeleteCadence,
} from "@/hooks/use-agent-cadences";
import CadenceEditorDialog from "./CadenceEditorDialog";
import StartCadenceDialog from "./StartCadenceDialog";
import { type AgentCadence, formatStepDelay } from "@/types/agent-cadences";

interface Props {
  agentId?: string;
  isFreshNew?: boolean;
}

export default function CadencesSection({ agentId, isFreshNew }: Props) {
  const { data: cadences = [], isLoading } = useAgentCadences(agentId);
  const toggle = useToggleCadence();
  const del = useDeleteCadence();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AgentCadence | null>(null);
  const [starting, setStarting] = useState<AgentCadence | null>(null);
  const [deleting, setDeleting] = useState<AgentCadence | null>(null);

  const header = (
    <div>
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" /> Cadências
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Sequências temporais de mensagens que este agente executa após um gatilho (cadastro, lead, etc).
      </p>
    </div>
  );

  if (isFreshNew || !agentId) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Salve o agente primeiro para criar cadências.</p>
        </div>
      </div>
    );
  }

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (c: AgentCadence) => {
    setEditing(c);
    setEditorOpen(true);
  };

  const onToggle = (c: AgentCadence, enabled: boolean) => {
    toggle.mutate({ id: c.id, agent_id: c.agent_id, enabled });
  };

  const onDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync({ id: deleting.id, agent_id: deleting.agent_id });
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      {header}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {!isLoading && cadences.length === 0 && (
        <RichEmptyState
          icon={Clock}
          title="Nenhuma cadência ainda"
          description="Cadências permitem que o agente faça follow-ups automáticos (ex: D+1, D+3, D+7) sem você precisar lembrar. Ideal pra reativar leads frios."
          primaryAction={{ label: "Criar primeira cadência", icon: Plus, onClick: openNew }}
        />
      )}

      {!isLoading && cadences.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {cadences.length} cadência{cadences.length === 1 ? "" : "s"}
            </p>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" /> Nova cadência
            </Button>
          </div>

          <div className="space-y-3">
            {cadences.map((c) => {
              const visibleSteps = c.steps.slice(0, 4);
              const more = c.steps.length - visibleSteps.length;
              return (
                <div key={c.id} className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <Badge variant={c.enabled ? "default" : "secondary"} className="text-[10px]">
                          {c.enabled ? "Ativa" : "Pausada"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {c.trigger_type === "manual" ? "Manual" : "Automática"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.steps.length} etapa{c.steps.length === 1 ? "" : "s"} · {c.executions_count ?? 0} execuç{(c.executions_count ?? 0) === 1 ? "ão" : "ões"}
                        {c.description ? ` · ${c.description}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={c.enabled} onCheckedChange={(v) => onToggle(c, v)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)} title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleting(c)} title="Remover">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-border pt-2">
                    {visibleSteps.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="font-mono shrink-0">{formatStepDelay(s)}</span>
                        <span className="text-muted-foreground/70">·</span>
                        <span className="capitalize">{s.channel}</span>
                        <span className="text-muted-foreground/70">·</span>
                        <span className="truncate flex-1">"{s.message_template.slice(0, 60)}{s.message_template.length > 60 ? "..." : ""}"</span>
                      </div>
                    ))}
                    {more > 0 && (
                      <p className="text-[11px] text-muted-foreground pl-5">... e mais {more} step{more === 1 ? "" : "s"}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => openEdit(c)}>
                      <Pencil className="w-3 h-3" /> Editar etapas
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setStarting(c)} disabled={!c.enabled}>
                      <Play className="w-3 h-3" /> Iniciar para contato
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editorOpen && (
        <CadenceEditorDialog
          open={editorOpen}
          onOpenChange={(v) => { setEditorOpen(v); if (!v) setEditing(null); }}
          agentId={agentId}
          cadence={editing}
        />
      )}

      {starting && (
        <StartCadenceDialog
          open={!!starting}
          onOpenChange={(v) => { if (!v) setStarting(null); }}
          agentId={agentId}
          cadence={starting}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cadência?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.name}" será removida junto com todas as execuções relacionadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
