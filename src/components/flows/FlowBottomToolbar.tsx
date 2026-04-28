import { useState, useEffect, useCallback } from "react";
import { NODE_CATEGORIES, NODE_TEMPLATES, type FlowExecution } from "@/types/flow-builder";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Zap, Cpu, GitBranch, SlidersHorizontal, Send, Plug, FormInput, Target,
  BookOpen, Database, Code2, History, CheckCircle, XCircle, Loader2, Clock,
  Search, GripVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const categoryIcons: Record<string, React.ReactNode> = {
  trigger: <Zap className="w-4 h-4" />,
  processing: <Cpu className="w-4 h-4" />,
  logic: <GitBranch className="w-4 h-4" />,
  control: <SlidersHorizontal className="w-4 h-4" />,
  output: <Send className="w-4 h-4" />,
  integration: <Plug className="w-4 h-4" />,
  data_capture: <FormInput className="w-4 h-4" />,
  crm_actions: <Target className="w-4 h-4" />,
  knowledge: <BookOpen className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  dev_advanced: <Code2 className="w-4 h-4" />,
};

const categoryBorder: Record<string, string> = {
  trigger: "border-l-emerald-500",
  processing: "border-l-indigo-500",
  logic: "border-l-amber-500",
  control: "border-l-pink-500",
  output: "border-l-cyan-500",
  integration: "border-l-violet-500",
  data_capture: "border-l-emerald-400",
  crm_actions: "border-l-orange-500",
  knowledge: "border-l-purple-500",
  database: "border-l-blue-500",
  dev_advanced: "border-l-slate-500",
};

interface Props {
  onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
  flowId?: string;
}

export default function FlowBottomToolbar({ onAddNode, flowId }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTemplates = openCategory
    ? NODE_TEMPLATES.filter((t) => t.category === openCategory).filter(
        (t) =>
          !search ||
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const categoryLabel = openCategory
    ? NODE_CATEGORIES.find((c) => c.key === openCategory)?.label || ""
    : "";

  const loadHistory = useCallback(async () => {
    if (!flowId) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("flow_executions")
      .select("*")
      .eq("flow_id", flowId)
      .order("created_at", { ascending: false })
      .limit(10);
    setExecutions((data as unknown as FlowExecution[]) || []);
    setLoadingHistory(false);
  }, [flowId]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  useEffect(() => {
    if (!openCategory) setSearch("");
  }, [openCategory]);

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--success))]" />;
    if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const getDuration = (exec: FlowExecution) => {
    if (!exec.completed_at || !exec.started_at) return "—";
    const ms = new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Show all categories that have templates
  const visibleCategories = NODE_CATEGORIES.filter((c) =>
    NODE_TEMPLATES.some((t) => t.category === c.key)
  );

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-card/95 backdrop-blur-md border border-border rounded-2xl px-2 py-1.5 shadow-xl">
        {visibleCategories.map((cat) => {
          const isOpen = openCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setOpenCategory(isOpen ? null : cat.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all",
                isOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
              title={cat.label}
            >
              {categoryIcons[cat.key]}
              <span className="text-[9px] font-medium leading-none">{cat.label}</span>
            </button>
          );
        })}
        {flowId && (
          <>
            <div className="w-px h-7 bg-border mx-1" />
            <button
              onClick={() => setShowHistory(true)}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all hover:bg-accent/60 text-muted-foreground hover:text-foreground"
              title="Histórico"
            >
              <History className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Histórico</span>
            </button>
          </>
        )}
      </div>

      {/* Category dialog with search + drag */}
      <Dialog open={!!openCategory} onOpenChange={(open) => !open && setOpenCategory(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {openCategory && categoryIcons[openCategory]}
              {categoryLabel}
              <Badge variant="secondary" className="ml-1 text-[10px] font-normal">
                {filteredTemplates.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar blocos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum bloco encontrado.</p>
            ) : (
              filteredTemplates.map((tpl) => (
                <div
                  key={tpl.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, tpl.type)}
                  onClick={() => {
                    onAddNode(tpl.type);
                    setOpenCategory(null);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/60 border-l-[3px] cursor-pointer hover:bg-accent/40 hover:border-primary/40 transition-all group",
                    categoryBorder[tpl.category]
                  )}
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0" />
                  <span className="text-base flex-shrink-0">{tpl.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{tpl.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{tpl.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Clique para adicionar ou arraste para o canvas
          </p>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Execuções
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 mt-2">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma execução encontrada.</p>
                <p className="text-[10px] text-muted-foreground">Execute o fluxo para ver o histórico aqui.</p>
              </div>
            ) : (
              executions.map((exec) => (
                <div key={exec.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40">
                  {statusIcon(exec.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{exec.flow_name || "Execução"}</span>
                      <Badge
                        variant={exec.status === "completed" ? "default" : exec.status === "failed" ? "destructive" : "secondary"}
                        className="text-[9px] px-1.5"
                      >
                        {exec.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span>{exec.trigger_type}</span>
                      <span>•</span>
                      <span>{new Date(exec.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span>{getDuration(exec)}</span>
                    </div>
                  </div>
                  {exec.error_message && (
                    <p className="text-[9px] text-destructive max-w-[150px] truncate" title={exec.error_message}>
                      {exec.error_message}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
