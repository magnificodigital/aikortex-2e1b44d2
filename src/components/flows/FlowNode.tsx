import { memo } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { FlowNodeData } from "@/types/flow-builder";
import { cn } from "@/lib/utils";
import { Copy, Trash2 } from "lucide-react";

/** Sim Studio–style category colors */
const categoryColors: Record<string, { bg: string; border: string; iconBg: string; handle: string }> = {
  trigger:      { bg: "bg-emerald-500/5", border: "border-emerald-500/20", iconBg: "bg-emerald-500/15", handle: "!bg-emerald-500" },
  processing:   { bg: "bg-indigo-500/5",  border: "border-indigo-500/20",  iconBg: "bg-indigo-500/15",  handle: "!bg-indigo-500" },
  logic:        { bg: "bg-amber-500/5",   border: "border-amber-500/20",   iconBg: "bg-amber-500/15",   handle: "!bg-amber-500" },
  control:      { bg: "bg-pink-500/5",    border: "border-pink-500/20",    iconBg: "bg-pink-500/15",    handle: "!bg-pink-500" },
  output:       { bg: "bg-cyan-500/5",    border: "border-cyan-500/20",    iconBg: "bg-cyan-500/15",    handle: "!bg-cyan-500" },
  integration:  { bg: "bg-violet-500/5",  border: "border-violet-500/20",  iconBg: "bg-violet-500/15",  handle: "!bg-violet-500" },
  data_capture: { bg: "bg-emerald-400/5", border: "border-emerald-400/20", iconBg: "bg-emerald-400/15", handle: "!bg-emerald-400" },
  crm_actions:  { bg: "bg-orange-500/5",  border: "border-orange-500/20",  iconBg: "bg-orange-500/15",  handle: "!bg-orange-500" },
  knowledge:    { bg: "bg-purple-500/5",  border: "border-purple-500/20",  iconBg: "bg-purple-500/15",  handle: "!bg-purple-500" },
  database:     { bg: "bg-blue-500/5",    border: "border-blue-500/20",    iconBg: "bg-blue-500/15",    handle: "!bg-blue-500" },
  dev_advanced: { bg: "bg-slate-500/5",   border: "border-slate-500/20",   iconBg: "bg-slate-500/15",   handle: "!bg-slate-500" },
};

const defaultCat = { bg: "bg-muted/30", border: "border-border", iconBg: "bg-muted/60", handle: "!bg-muted-foreground" };

/** Labels for config keys */
const CONFIG_LABELS: Record<string, string> = {
  channel: "Canal", model: "Modelo", temperature: "Temperatura", systemPrompt: "Prompt",
  url: "URL", method: "Método", code: "Código", language: "Linguagem",
  expression: "Expressão", criteria: "Critério", variable: "Variável", value: "Valor",
  duration: "Duração", unit: "Unidade", approvalMessage: "Mensagem", branches: "Ramos",
  maxIterations: "Máx. Iterações", iterableVariable: "Lista", format: "Formato",
  template: "Template", provider: "Provedor", action: "Ação", to: "Para",
  subject: "Assunto", body: "Corpo", phone: "Telefone", spreadsheetId: "Planilha",
  range: "Intervalo", workflowId: "Workflow", frequency: "Frequência", time: "Horário",
  rules: "Regras", routes: "Rotas", prompt: "Pergunta", required: "Obrigatório",
  message: "Mensagem", title: "Título", tag: "Tag", delay: "Atraso", type: "Tipo",
  source: "Origem", agentId: "Agente", maxResults: "Resultados", lookbackMessages: "Histórico",
  collection: "Coleção", topK: "Top K", table: "Tabela", filter: "Filtro",
  fields: "Campos", recordId: "ID Registro", data: "Dados", reason: "Motivo",
  intents: "Intenções", maxLength: "Máx. Caracteres", condition: "Condição",
  assignee: "Responsável", dueDate: "Vencimento", dealId: "Negócio", targetStage: "Etapa Destino",
  leadId: "ID Lead", scoreChange: "Δ Score", ownerId: "Dono", statusCode: "Status HTTP",
};

function FlowNode({ data, selected, id }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const cat = categoryColors[d.category] || defaultCat;
  const isCondition = d.nodeType === "condition" || d.nodeType === "router" || d.nodeType === "evaluator";
  const { setNodes, setEdges, getNodes } = useReactFlow();

  const configEntries = Object.entries(d.config || {}).filter(
    ([, v]) => v !== "" && v !== undefined && v !== null && !Array.isArray(v) && typeof v !== "object"
  ).slice(0, 4);

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nodes = getNodes();
    const original = nodes.find((n) => n.id === id);
    if (!original) return;
    const newId = `node-dup-${Date.now()}`;
    setNodes((nds) => [...nds, { ...original, id: newId, position: { x: original.position.x + 40, y: original.position.y + 60 }, selected: false }]);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className="relative group">
      {/* Floating toolbar */}
      {selected && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-lg px-1 py-0.5 nodrag nopan">
          <button onClick={handleDuplicate} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Duplicar">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Apagar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "rounded-xl border bg-card px-4 py-3 min-w-[260px] max-w-[320px] shadow-md transition-all cursor-pointer",
          cat.border,
          cat.bg,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl scale-[1.02]"
        )}
      >
        {/* Input handle */}
        {d.category !== "trigger" && (
          <Handle
            type="target"
            position={Position.Left}
            className={cn("!w-3 !h-3 !border-2 !border-card", cat.handle)}
          />
        )}

        {/* Header — Sim Studio style */}
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", cat.iconBg)}>
            <span className="text-lg">{d.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{d.label}</p>
            {configEntries.length === 0 && d.description && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{d.description}</p>
            )}
          </div>
        </div>

        {/* Config key-value rows — Sim Studio style */}
        {configEntries.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-border/30 space-y-1.5">
            {configEntries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {CONFIG_LABELS[key] || key}
                </span>
                <span className="text-[11px] text-foreground font-mono truncate max-w-[160px] text-right bg-muted/30 px-1.5 py-0.5 rounded">
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Output handles */}
        {isCondition ? (
          <>
            <Handle
              type="source"
              position={Position.Right}
              id="yes"
              className={cn("!w-3 !h-3 !border-2 !border-card !top-[30%]", cat.handle)}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="no"
              className={cn("!w-3 !h-3 !border-2 !border-card !top-[70%]", cat.handle)}
            />
            <div className="absolute right-[-28px] flex flex-col justify-between h-full top-0 py-2 pointer-events-none">
              <span className="text-[9px] text-green-400 font-semibold">True</span>
              <span className="text-[9px] text-red-400 font-semibold">False</span>
            </div>
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Right}
            className={cn("!w-3 !h-3 !border-2 !border-card", cat.handle)}
          />
        )}
      </div>
    </div>
  );
}

export default memo(FlowNode);
