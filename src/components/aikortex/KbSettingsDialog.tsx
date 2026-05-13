import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useUpdateKb, useDeleteKb, type AgentKnowledgeBase } from "@/hooks/use-agent-knowledge-bases";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kb: AgentKnowledgeBase;
}

export default function KbSettingsDialog({ open, onOpenChange, kb }: Props) {
  const update = useUpdateKb();
  const del = useDeleteKb();
  const [name, setName] = useState(kb.name);
  const [description, setDescription] = useState(kb.description ?? "");
  const [enabled, setEnabled] = useState(kb.enabled);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    if (open) {
      setName(kb.name);
      setDescription(kb.description ?? "");
      setEnabled(kb.enabled);
      setConfirmDelete("");
    }
  }, [open, kb]);

  const dirty = name.trim() !== kb.name || (description.trim() || null) !== (kb.description || null) || enabled !== kb.enabled;

  async function save() {
    if (!name.trim()) return;
    await update.mutateAsync({
      id: kb.id,
      agent_id: kb.agent_id,
      patch: {
        name: name.trim(),
        description: description.trim() || null,
        enabled,
      },
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (confirmDelete !== kb.name) return;
    await del.mutateAsync({ kb_id: kb.id, agent_id: kb.agent_id });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações da base</DialogTitle>
          <DialogDescription>Renomeie, descreva ou exclua esta base de conhecimento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Base habilitada</p>
              <p className="text-xs text-muted-foreground">Quando desabilitada, o agente ignora esta base nas buscas.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Zona de perigo</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Excluir esta base remove <span className="font-medium">todos os documentos, chunks e arquivos</span> associados. Não pode ser desfeito.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Digite <code className="px-1 rounded bg-muted">{kb.name}</code> para confirmar</Label>
              <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={kb.name} />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 w-full"
              disabled={confirmDelete !== kb.name || del.isPending}
              onClick={handleDelete}
            >
              {del.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Excluir base permanentemente
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!dirty || !name.trim() || update.isPending} className="gap-2">
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
