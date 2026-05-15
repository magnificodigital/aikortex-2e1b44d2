import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Upload, Download, Trash2, Settings, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useClientTableRows, useCreateRow, useUpdateRow, useDeleteRows,
  type ClientTable, type ClientTableColumn, type ClientTableRow,
} from "@/hooks/use-client-tables";
import ClientTableSettingsDialog from "./ClientTableSettingsDialog";
import ImportTableDialog from "./ImportTableDialog";

interface Props {
  table: ClientTable;
  onBack: () => void;
}

const PAGE_SIZES = [25, 50, 100];

export default function ClientTableEditor({ table, onBack }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading } = useClientTableRows(table.id, { page, pageSize });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createRow = useCreateRow();
  const updateRow = useUpdateRow();
  const deleteRows = useDeleteRows();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ rowId: string; key: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const cols = table.columns;

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const empty: Record<string, any> = {};
    for (const c of cols) empty[c.key] = c.type === "boolean" ? false : null;
    await createRow.mutateAsync({ table_id: table.id, data: empty });
    toast.success("Linha adicionada");
  };

  const handleDeleteOne = async (id: string) => {
    await deleteRows.mutateAsync({ ids: [id], table_id: table.id });
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await deleteRows.mutateAsync({ ids, table_id: table.id });
    setSelected(new Set());
    setConfirmBulk(false);
    toast.success(`${ids.length} linhas excluídas`);
  };

  const saveCell = async (row: ClientTableRow, col: ClientTableColumn, raw: any) => {
    let value: any = raw;
    if (col.type === "number") {
      if (raw === "" || raw === null) value = null;
      else {
        const n = Number(String(raw).replace(",", "."));
        if (Number.isNaN(n)) { toast.error("Valor inválido"); return; }
        value = n;
      }
    } else if (col.type === "text") {
      value = raw === "" ? null : String(raw);
    } else if (col.type === "boolean") {
      value = !!raw;
    }
    if (row.data[col.key] === value) { setEditing(null); return; }
    await updateRow.mutateAsync({
      id: row.id,
      table_id: table.id,
      data: { ...row.data, [col.key]: value },
    });
    setEditing(null);
  };

  const handleExport = async () => {
    const { data: all, error } = await supabase
      .from("client_table_rows")
      .select("data")
      .eq("table_id", table.id)
      .order("created_at", { ascending: true });
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    const headers = cols.map((c) => c.label);
    const csvLines = [
      headers.join(","),
      ...((all ?? []) as { data: Record<string, any> }[]).map((r) =>
        cols.map((c) => {
          const v = r.data?.[c.key];
          const s = v === null || v === undefined ? "" : String(v);
          const esc = s.replace(/"/g, '""');
          return /[,"\n]/.test(esc) ? `"${esc}"` : esc;
        }).join(",")
      ),
    ];
    const blob = new Blob(["\ufeff" + csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{table.name}</h2>
            <p className="text-xs text-muted-foreground">
              {total} linha{total === 1 ? "" : "s"} · {cols.length} coluna{cols.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)} title="Configurações">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input disabled placeholder="Buscar (em breve)" className="pl-7 h-8 text-xs" />
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={handleAdd} disabled={createRow.isPending}>
          <Plus className="w-3.5 h-3.5" /> Nova linha
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setImportOpen(true)}>
          <Upload className="w-3.5 h-3.5" /> Importar
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" /> Exportar
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="w-10 px-2 py-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              {cols.map((c) => (
                <th key={c.key} className="px-2 py-2 text-left font-medium text-xs text-muted-foreground">
                  {c.label}
                </th>
              ))}
              <th className="w-12 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={cols.length + 2} className="p-4"><Skeleton className="h-6 w-full" /></td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 2} className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma linha. Clique em "Nova linha" ou importe um arquivo.
                </td>
              </tr>
            )}
            {!isLoading && rows.map((r) => (
              <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                <td className="px-2 py-1.5">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} />
                </td>
                {cols.map((c) => {
                  const isEditing = editing?.rowId === r.id && editing.key === c.key;
                  const v = r.data?.[c.key];
                  if (c.type === "boolean") {
                    return (
                      <td key={c.key} className="px-2 py-1.5">
                        <Checkbox checked={!!v} onCheckedChange={(val) => saveCell(r, c, !!val)} />
                      </td>
                    );
                  }
                  if (isEditing) {
                    return (
                      <td key={c.key} className="px-1 py-1">
                        <CellInput
                          type={c.type === "number" ? "number" : "text"}
                          defaultValue={v ?? ""}
                          onCommit={(val) => saveCell(r, c, val)}
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    );
                  }
                  return (
                    <td
                      key={c.key}
                      className="px-2 py-1.5 cursor-text truncate max-w-[200px]"
                      onClick={() => setEditing({ rowId: r.id, key: c.key })}
                      title={v == null ? "" : String(v)}
                    >
                      {v == null || v === "" ? <span className="text-muted-foreground/50">—</span> : String(v)}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteOne(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
          <p className="text-sm">{selected.size} selecionada{selected.size === 1 ? "" : "s"}</p>
          <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={() => setConfirmBulk(true)}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir selecionadas
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            « Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button size="sm" variant="outline" className="h-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próximo »
          </Button>
        </div>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} linhas/página</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ClientTableSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} table={table} />
      <ImportTableDialog open={importOpen} onOpenChange={setImportOpen} table={table} />

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} linhas?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteRows.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CellInput({
  type, defaultValue, onCommit, onCancel,
}: {
  type: "text" | "number";
  defaultValue: any;
  onCommit: (v: any) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState<string>(defaultValue == null ? "" : String(defaultValue));
  return (
    <Input
      autoFocus
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onCommit(val); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      className="h-7 text-sm"
    />
  );
}
