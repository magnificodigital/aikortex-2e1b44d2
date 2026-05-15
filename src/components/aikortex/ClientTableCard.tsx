import { useState } from "react";
import { Settings, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClientTable } from "@/hooks/use-client-tables";
import ClientTableSettingsDialog from "./ClientTableSettingsDialog";

interface Props {
  table: ClientTable;
  onOpenEditor: (table: ClientTable) => void;
}

const TYPE_LABELS: Record<string, string> = {
  text: "texto",
  number: "número",
  boolean: "sim/não",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function ClientTableCard({ table, onOpenEditor }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cols = table.columns ?? [];
  const rowsCount = table.rows_count ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-4 h-4 text-primary shrink-0" />
          <h3 className="font-semibold text-sm text-foreground truncate">{table.name}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setSettingsOpen(true)}
          title="Configurações"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </div>

      {table.description && (
        <p className="text-xs text-muted-foreground">{table.description}</p>
      )}

      <p className="text-[11px] text-muted-foreground">
        {cols.length} coluna{cols.length === 1 ? "" : "s"} · {rowsCount} linha{rowsCount === 1 ? "" : "s"} · atualizado há {timeAgo(table.updated_at)}
      </p>

      {cols.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cols.map((c) => (
            <Badge key={c.key} variant="secondary" className="text-[10px] font-normal gap-1">
              {c.label}
              <span className="text-muted-foreground">({TYPE_LABELS[c.type] ?? c.type})</span>
            </Badge>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenEditor(table)}>
        Abrir editor
      </Button>

      <ClientTableSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} table={table} />
    </div>
  );
}
