import { useState } from "react";
import { RefreshCw, Plus, Download, Code2, Search, ArrowUpDown, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAppBuilder } from "@/contexts/AppBuilderContext";

const DatabasePanel = () => {
  const { tables } = useAppBuilder();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [search, setSearch] = useState("");

  const effectiveSelected = selectedTable || tables[0]?.name || "";
  const table = tables.find((t) => t.name === effectiveSelected) || tables[0];

  if (tables.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Envie uma mensagem no Studio para gerar as tabelas do banco de dados
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-background overflow-hidden">
      <div className="w-[200px] min-w-[180px] border-r border-border flex flex-col bg-card/50">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Tables</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Atualizar">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {tables.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelectedTable(t.name)}
              className={cn(
                "flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors",
                effectiveSelected === t.name
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {table && (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{table.name}</span>
              <span className="text-xs text-muted-foreground">
                {table.rows.length === 0 ? "No rows" : `${table.rows.length} rows`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"><Plus className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5 rotate-180" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Code2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs bg-muted/30 border-border" />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 px-3 py-2 text-left"><Checkbox className="h-3.5 w-3.5" /></th>
                  {table.columns.map((col) => (
                    <th key={col.name} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{col.name}</span>
                        <span className="text-[10px] text-muted-foreground/60">({col.type})</span>
                        {col.isPK && <span className="text-[9px] font-semibold text-primary">PK</span>}
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/40 shrink-0 cursor-pointer hover:text-foreground" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 && (
                  <tr>
                    <td colSpan={table.columns.length + 1} className="text-center py-16 text-sm text-muted-foreground">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabasePanel;
