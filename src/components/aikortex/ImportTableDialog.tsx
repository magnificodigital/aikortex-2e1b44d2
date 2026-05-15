import { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useBulkInsertRows,
  type ClientTable,
  type ClientTableColumn,
  type ColumnType,
} from "@/hooks/use-client-tables";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const IGNORE = "__ignore__";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  table: ClientTable;
  onDone?: () => void;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function suggestMapping(fileCols: string[], tableCols: ClientTableColumn[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const fc of fileCols) {
    const nf = normalize(fc);
    const match = tableCols.find((tc) => normalize(tc.label) === nf || normalize(tc.key) === nf);
    m[fc] = match ? match.key : IGNORE;
  }
  return m;
}

function coerce(value: any, type: ColumnType): { ok: boolean; value: any; error?: string } {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  if (type === "text") return { ok: true, value: String(value) };
  if (type === "number") {
    const n = Number(String(value).replace(",", "."));
    if (Number.isNaN(n)) return { ok: false, value, error: `"${value}" não é número` };
    return { ok: true, value: n };
  }
  if (type === "boolean") {
    const s = String(value).toLowerCase().trim();
    if (["sim", "true", "1", "yes", "x", "verdadeiro"].includes(s)) return { ok: true, value: true };
    if (["não", "nao", "false", "0", "no", "falso"].includes(s)) return { ok: true, value: false };
    return { ok: false, value, error: `"${value}" não é booleano` };
  }
  return { ok: true, value };
}

async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res: any) => {
          resolve({ headers: res.meta.fields ?? [], rows: res.data });
        },
        error: reject,
      });
    });
  }
  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const headers = Object.keys(json[0] ?? {});
    return { headers, rows: json };
  }
  throw new Error("Formato não suportado. Use CSV, XLSX ou XLS.");
}

export default function ImportTableDialog({ open, onOpenChange, table, onDone }: Props) {
  const bulk = useBulkInsertRows();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);

  const reset = () => {
    setStep(1); setFileName(""); setHeaders([]); setRows([]); setMapping({});
  };
  const close = () => { reset(); onOpenChange(false); };

  const onFile = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) { toast.error("Arquivo > 5MB"); return; }
    setParsing(true);
    try {
      const { headers: h, rows: r } = await parseFile(file);
      if (r.length > MAX_ROWS) { toast.error(`Máximo ${MAX_ROWS} linhas (arquivo tem ${r.length})`); return; }
      if (r.length === 0) { toast.error("Arquivo vazio"); return; }
      setFileName(file.name);
      setHeaders(h);
      setRows(r);
      setMapping(suggestMapping(h, table.columns));
      setStep(2);
    } catch (e) {
      toast.error(`Erro ao parsear: ${(e as Error).message}`);
    } finally {
      setParsing(false);
    }
  }, [table.columns]);

  // Validation summary
  const summary = (() => {
    if (step !== 3) return null;
    let valid = 0, errors = 0;
    const validRows: Record<string, any>[] = [];
    const errorMessages: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const out: Record<string, any> = {};
      let rowOk = true;
      for (const [fileCol, tableKey] of Object.entries(mapping)) {
        if (tableKey === IGNORE) continue;
        const col = table.columns.find((c) => c.key === tableKey);
        if (!col) continue;
        const res = coerce(r[fileCol], col.type);
        if (!res.ok) {
          rowOk = false;
          if (errorMessages.length < 5) errorMessages.push(`Linha ${i + 2}, ${col.label}: ${res.error}`);
        } else {
          out[tableKey] = res.value;
        }
      }
      if (rowOk && Object.keys(out).length > 0) { valid++; validRows.push(out); }
      else if (!rowOk) errors++;
    }
    return { valid, errors, validRows, errorMessages };
  })();

  const runImport = async () => {
    if (!summary) return;
    if (summary.validRows.length === 0) { toast.error("Nenhuma linha válida"); return; }
    try {
      const { inserted } = await bulk.mutateAsync({ table_id: table.id, rows: summary.validRows });
      toast.success(`${inserted} linhas importadas`);
      onDone?.();
      close();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar para {table.name}</DialogTitle>
          <DialogDescription>
            Passo {step} de 3 · {step === 1 ? "Selecione o arquivo" : step === 2 ? "Mapeie as colunas" : "Revise e importe"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <label className="block">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <div className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:bg-accent/30 transition">
              {parsing ? (
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              ) : (
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              )}
              <p className="mt-2 text-sm font-medium">Clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLSX ou XLS · máx 5MB / 10.000 linhas</p>
            </div>
          </label>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" /> {fileName} · {rows.length} linhas
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Mapeamento de colunas</p>
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <div className="flex-1 text-sm truncate" title={h}>{h}</div>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Select value={mapping[h] ?? IGNORE} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                    <SelectTrigger className="w-56 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE}>— Ignorar —</SelectItem>
                      {table.columns.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label} ({c.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {rows.length > 0 && (
              <div className="border border-border rounded-md overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>{headers.map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {headers.map((h) => <td key={h} className="px-2 py-1 truncate max-w-[150px]">{String(r[h] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === 3 && summary && (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-4 space-y-1 text-sm">
              <p><strong className="text-foreground">{summary.valid}</strong> linhas válidas</p>
              {summary.errors > 0 && (
                <p className="text-destructive"><strong>{summary.errors}</strong> linhas com erro</p>
              )}
            </div>
            {summary.errorMessages.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" /> Exemplos de erros
                </div>
                {summary.errorMessages.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Linhas com erro serão ignoradas. Apenas as válidas serão importadas.
            </p>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as any)}>Voltar</Button>}
          <Button variant="ghost" onClick={close}>Cancelar</Button>
          {step === 2 && <Button onClick={() => setStep(3)}>Continuar</Button>}
          {step === 3 && (
            <Button onClick={runImport} disabled={bulk.isPending || !summary || summary.valid === 0}>
              {bulk.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importar {summary?.valid ?? 0} linhas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
