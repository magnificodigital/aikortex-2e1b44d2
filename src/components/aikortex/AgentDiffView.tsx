import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { computeAgentDiff, summarizeBySection, countChanges } from "@/lib/agent-diff";

function fmt(v: any): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

export default function AgentDiffView({
  before,
  after,
  fromLabel,
  toLabel,
  compact = false,
}: {
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  fromLabel?: string;
  toLabel?: string;
  compact?: boolean;
}) {
  const changes = computeAgentDiff(before, after);
  const groups = summarizeBySection(changes);
  const counts = countChanges(changes);
  const [showJson, setShowJson] = useState(false);

  if (counts.total === 0) {
    return <p className="text-xs text-muted-foreground">Sem alterações.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {counts.changed} alterado{counts.changed !== 1 ? "s" : ""}, {counts.added} adicionado{counts.added !== 1 ? "s" : ""}, {counts.removed} removido{counts.removed !== 1 ? "s" : ""}.
      </p>
      {!compact && (
        <div className="space-y-3">
          {groups.map(([section, items]) => (
            <div key={section} className="rounded-lg border border-border bg-card/40 p-3">
              <h4 className="text-xs font-semibold text-foreground mb-2">─── {section} ───</h4>
              <div className="space-y-2">
                {items.map((c) => (
                  <div key={c.path} className="text-xs">
                    <div className="font-mono text-muted-foreground">
                      ▸ {c.path}
                      {c.kind === "added" && <span className="ml-1 text-emerald-500">(novo)</span>}
                      {c.kind === "removed" && <span className="ml-1 text-destructive">(removido)</span>}
                    </div>
                    {c.kind !== "added" && (
                      <div className="font-mono text-destructive/80 whitespace-pre-wrap pl-3">- {fmt(c.before)}</div>
                    )}
                    {c.kind !== "removed" && (
                      <div className="font-mono text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap pl-3">+ {fmt(c.after)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {compact && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {groups.map(([section, items]) => (
            <li key={section}>• {items.length} {items.length === 1 ? "campo" : "campos"} em "{section}"</li>
          ))}
        </ul>
      )}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowJson(true)}>
        Ver JSON completo
      </Button>

      <Dialog open={showJson} onOpenChange={setShowJson}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">JSON completo · {fromLabel || "antes"} → {toLabel || "depois"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 overflow-auto">
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">{fromLabel || "antes"}</div>
              <pre className="text-[10px] bg-muted/50 p-2 rounded border border-border whitespace-pre-wrap break-all">
                {JSON.stringify(before ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">{toLabel || "depois"}</div>
              <pre className="text-[10px] bg-muted/50 p-2 rounded border border-border whitespace-pre-wrap break-all">
                {JSON.stringify(after ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
