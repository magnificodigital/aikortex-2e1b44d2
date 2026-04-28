import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { Zap, Boxes, Workflow, Plug, ListOrdered } from "lucide-react";
import type { FlowNodeData } from "@/types/flow-builder";
import { cn } from "@/lib/utils";

interface Props {
  flowName: string;
  nodes: Node[];
  edges: Edge[];
  isActive?: boolean;
  onSelectNode?: (node: Node) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  trigger: "Gatilho",
  processing: "Processo",
  logic: "Lógica",
  control: "Controle",
  output: "Saída",
  integration: "Integração",
  data_capture: "Captura",
  crm_actions: "CRM",
  knowledge: "IA",
  database: "DB",
  dev_advanced: "Avançado",
};

const asData = (n: Node): FlowNodeData => n.data as unknown as FlowNodeData;

export default function FlowInfoPanel({ flowName, nodes, edges, isActive, onSelectNode }: Props) {
  const stats = useMemo(() => {
    const triggers = nodes.filter((n) => {
      const d = asData(n);
      return d?.category === "trigger" || d?.nodeType?.startsWith("trigger_");
    });
    const integrations = nodes.filter((n) => asData(n)?.category === "integration");
    return { triggers, integrations };
  }, [nodes]);

  const journey = useMemo(
    () => [...nodes].sort((a, b) => a.position.x - b.position.x).slice(0, 8),
    [nodes]
  );

  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-3">
      {/* FLUXO CRIADO */}
      <section className={cn(
        "rounded-xl border p-3",
        isActive ? "border-primary/40 bg-primary/5" : "border-border bg-card/40"
      )}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <Zap className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isActive ? "text-primary" : "text-muted-foreground"
          )}>
            {isActive ? "Fluxo Ativo" : "Fluxo Criado"}
          </span>
        </div>
        <div className="space-y-1.5">
          <Row label="Nome" value={flowName || "Sem nome"} />
          <Row label="Blocos" value={String(nodes.length)} />
          <Row label="Conexões" value={String(edges.length)} />
          <Row label="Status" value={isActive ? "Publicado" : "Rascunho"} />
        </div>
      </section>

      {/* GATILHOS */}
      <section className="rounded-xl border border-border bg-card/40 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Workflow className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gatilhos</span>
        </div>
        {stats.triggers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">Nenhum gatilho</p>
        ) : (
          <div className="space-y-1">
            {stats.triggers.map((n) => {
              const d = asData(n);
              return (
                <button
                  key={n.id}
                  onClick={() => onSelectNode?.(n)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors text-left"
                >
                  <span className="text-sm">{d.icon}</span>
                  <span className="text-[11px] text-foreground truncate">{d.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* BLOCOS */}
      <section className="rounded-xl border border-border bg-card/40 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blocos</span>
        </div>
        {nodes.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">Adicione blocos pelo rodapé</p>
        ) : (
          <div className="space-y-1">
            {nodes.slice(0, 12).map((n) => {
              const d = asData(n);
              const cat = CATEGORY_LABEL[d.category] || d.category;
              return (
                <button
                  key={n.id}
                  onClick={() => onSelectNode?.(n)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm flex-shrink-0">{d.icon}</span>
                    <span className="text-[11px] text-foreground truncate">{d.label}</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground flex-shrink-0 px-1.5 py-0.5 rounded bg-muted/50">
                    {cat}
                  </span>
                </button>
              );
            })}
            {nodes.length > 12 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">+{nodes.length - 12} blocos</p>
            )}
          </div>
        )}
      </section>

      {/* INTEGRAÇÕES */}
      {stats.integrations.length > 0 && (
        <section className="rounded-xl border border-border bg-card/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Plug className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Integrações</span>
          </div>
          <div className="space-y-1">
            {stats.integrations.map((n) => {
              const d = asData(n);
              return (
                <button
                  key={n.id}
                  onClick={() => onSelectNode?.(n)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors text-left"
                >
                  <span className="text-sm">{d.icon}</span>
                  <span className="text-[11px] text-foreground truncate">{d.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* JORNADA */}
      {journey.length > 0 && (
        <section className="rounded-xl border border-border bg-card/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jornada</span>
          </div>
          <div className="space-y-1.5">
            {journey.map((n, i) => {
              const d = asData(n);
              return (
                <button
                  key={n.id}
                  onClick={() => onSelectNode?.(n)}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-accent/40 transition-colors text-left"
                >
                  <span className="w-4 h-4 rounded-full bg-muted/60 text-[9px] font-semibold text-muted-foreground flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-foreground truncate">{d.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-medium text-foreground truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}
