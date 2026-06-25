import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useUpdateClientTable, useDeleteClientTable, type ClientTable, type ClientTableColumn } from "@/hooks/use-client-tables";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  table: ClientTable;
}

const TYPE_LABEL: Record<ClientTableColumn["type"], string> = {
  text: "Texto",
  number: "Número",
  boolean: "Sim/Não",
};

export default function ClientTableSettingsDialog({ open, onOpenChange, table }: Props) {
  const update = useUpdateClientTable();
  const del = useDeleteClientTable();
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description ?? "");
  const [columns, setColumns] = useState<ClientTableColumn[]>(table.columns);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    if (open) {
      setName(table.name);
      setDescription(table.description ?? "");
      setColumns(table.columns);
      setConfirmDelete("");
    }
  }, [open, table]);

  const columnsDirty = useMemo(() => {
    if (columns.length !== table.columns.length) return true;
    return columns.some((c, i) => c.label !== table.columns[i]?.label);
  }, [columns, table.columns]);

  const dirty =
    name.trim() !== table.name ||
    (description.trim() || null) !== (table.description || null) ||
    columnsDirty;

  const labelsValid =
    columns.every((c) => c.label.trim().length > 0) &&
    new Set(columns.map((c) => c.label.trim().toLowerCase())).size === columns.length;

  async function save() {
    if (!name.trim() || !labelsValid) return;
    await update.mutateAsync({
      id: table.id,
      client_id: table.client_id,
      name: name.trim(),
      description: description.trim() || null,
      columns: columns.map((c) => ({ ...c, label: c.label.trim() })),
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações da tabela</DialogTitle>
          <DialogDescription>Renomeie a tabela, edite a descrição ou renomeie as colunas. Excluir é definitivo.</DialogDescription>
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

          <div className="space-y-2">
            <Label className="text-xs">Colunas</Label>
            <p className="text-[11px] text-muted-foreground">
              Renomeie o rótulo exibido. O tipo e o identificador interno não mudam — assim os dados existentes ficam intactos.
            </p>
            <div className="space-y-2">
              {columns.map((c, idx) => (
                <div key={c.key} className="flex items-center gap-2">
                  <Input
                    value={c.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setColumns((prev) => prev.map((p, i) => (i === idx ? { ...p, label: v } : p)));
                    }}
                    placeholder="Rótulo"
                    className="h-8 text-sm"
                  />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap min-w-[60px]">
                    {TYPE_LABEL[c.type]}
                  </span>
                </div>
              ))}
              {columns.length === 0 && (
                <p className="text-xs text-muted-foreground">Esta tabela não tem colunas.</p>
              )}
            </div>
            {!labelsValid && (
              <p className="text-[11px] text-destructive">
                Os rótulos não podem ficar vazios nem repetidos.
              </p>
            )}
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
          <Button onClick={save} disabled={!dirty || !name.trim() || !labelsValid || update.isPending} className="gap-2">
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
