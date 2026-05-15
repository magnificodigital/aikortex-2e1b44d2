import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useUpdateClientTable, useDeleteClientTable, type ClientTable } from "@/hooks/use-client-tables";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  table: ClientTable;
}

export default function ClientTableSettingsDialog({ open, onOpenChange, table }: Props) {
  const update = useUpdateClientTable();
  const del = useDeleteClientTable();
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    if (open) {
      setName(table.name);
      setDescription(table.description ?? "");
      setConfirmDelete("");
    }
  }, [open, table]);

  const dirty =
    name.trim() !== table.name ||
    (description.trim() || null) !== (table.description || null);

  async function save() {
    if (!name.trim()) return;
    await update.mutateAsync({
      id: table.id,
      client_id: table.client_id,
      name: name.trim(),
      description: description.trim() || null,
    });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (confirmDelete !== table.name) return;
    await del.mutateAsync({ id: table.id, client_id: table.client_id });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações da tabela</DialogTitle>
          <DialogDescription>Renomeie, edite a descrição ou exclua esta tabela. As colunas não são editáveis.</DialogDescription>
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

          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Zona de perigo</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Excluir esta tabela remove <span className="font-medium">todas as linhas</span> associadas. Não pode ser desfeito.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Digite <code className="px-1 rounded bg-muted">{table.name}</code> para confirmar</Label>
              <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={table.name} />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 w-full"
              disabled={confirmDelete !== table.name || del.isPending}
              onClick={handleDelete}
            >
              {del.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Excluir tabela permanentemente
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
