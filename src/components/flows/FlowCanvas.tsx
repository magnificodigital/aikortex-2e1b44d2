import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NODE_TEMPLATES, type FlowNodeData, type FlowExecution, type FlowNodeLog } from "@/types/flow-builder";
import FlowNode from "./FlowNode";
import FlowEdge from "./FlowEdge";
import FlowNodeConfig from "./FlowNodeConfig";
import FlowBottomToolbar from "./FlowBottomToolbar";
import FlowInfoPanel from "./FlowInfoPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Play,
  Rocket,
  Trash2,
  Copy,
  PanelRight,
  Settings2,
  Database,
  ListChecks,
  ScrollText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { SavedFlow } from "@/types/flow-builder";

const AUTO_LAYOUT_X_START = 100;
const AUTO_LAYOUT_X_GAP = 320;
const AUTO_LAYOUT_Y_CENTER = 220;
const AUTO_LAYOUT_Y_GAP = 180;

function layoutNodesLeftToRight(flowNodes: Node[], flowEdges: Edge[]): Node[] {
  if (flowNodes.length <= 1) return flowNodes;

  const incomingCount = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  flowNodes.forEach((node) => {
    incomingCount.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  flowEdges.forEach((edge) => {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  });

  const queue = flowNodes
    .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
    .map((node) => node.id);

  const depthMap = new Map<string, number>();

  queue.forEach((id) => depthMap.set(id, 0));

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depthMap.get(currentId) ?? 0;
    const targets = adjacency.get(currentId) ?? [];

    targets.forEach((targetId) => {
      const nextDepth = currentDepth + 1;
      depthMap.set(targetId, Math.max(depthMap.get(targetId) ?? 0, nextDepth));
      incomingCount.set(targetId, (incomingCount.get(targetId) ?? 1) - 1);

      if ((incomingCount.get(targetId) ?? 0) <= 0) {
        queue.push(targetId);
      }
    });
  }

  const positionedIds = new Set(depthMap.keys());
  const fallbackDepthStart = Math.max(...Array.from(depthMap.values(), (value) => value), 0);
  let fallbackDepth = fallbackDepthStart;

  flowNodes.forEach((node) => {
    if (!positionedIds.has(node.id)) {
      fallbackDepth += 1;
      depthMap.set(node.id, fallbackDepth);
    }
  });

  const columns = new Map<number, Node[]>();

  flowNodes.forEach((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  });

  columns.forEach((columnNodes) => {
    columnNodes.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  });

  return flowNodes.map((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    const columnNodes = columns.get(depth) ?? [node];
    const index = columnNodes.findIndex((columnNode) => columnNode.id === node.id);
    const offset = index - (columnNodes.length - 1) / 2;

    return {
      ...node,
      position: {
        x: AUTO_LAYOUT_X_START + depth * AUTO_LAYOUT_X_GAP,
        y: AUTO_LAYOUT_Y_CENTER + offset * AUTO_LAYOUT_Y_GAP,
      },
    };
  });
}

const nodeTypes: NodeTypes = {
  flowNode: FlowNode,
};

const edgeTypes: EdgeTypes = {
  flowEdge: FlowEdge,
};

const defaultStartNode: Node = {
  id: "start-1",
  type: "flowNode",
  position: { x: 50, y: 200 },
  data: {
    label: "Chat",
    category: "trigger",
    icon: "💬",
    description: "Inicia quando uma mensagem é recebida",
    config: { channel: "any" },
    color: "#22c55e",
    nodeType: "trigger_chat",
  } satisfies FlowNodeData,
};

let nodeIdCounter = 1;

type RightTab = "editor" | "database" | "tasks" | "logs";

const RIGHT_TABS: { id: RightTab; label: string; icon: React.ElementType }[] = [
  { id: "editor", label: "Editor", icon: Settings2 },
  { id: "database", label: "Database", icon: Database },
  { id: "tasks", label: "Tarefas", icon: ListChecks },
  { id: "logs", label: "Logs", icon: ScrollText },
];

interface FlowCanvasProps {
  initialNodes?: unknown[];
  initialEdges?: unknown[];
  flowName?: string;
  flowId?: string;
  onSave?: (name: string, nodes: unknown[], edges: unknown[], flowId?: string) => void;
  flows?: SavedFlow[];
  onOpenFlow?: (flow: SavedFlow) => void;
  onNewFlow?: () => void;
  initialPrompt?: string;
  headerLeft?: React.ReactNode;
}

function FlowCanvasInner({ initialNodes, initialEdges, flowName, flowId, onSave, flows = [], onOpenFlow, onNewFlow, initialPrompt, headerLeft }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const startNodes = initialNodes && (initialNodes as Node[]).length > 0
    ? (initialNodes as Node[])
    : [defaultStartNode];
  const [nodes, setNodes, onNodesChange] = useNodesState(startNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState((initialEdges as Edge[]) || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("editor");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runTestMessage, setRunTestMessage] = useState("");
  const [runContactId, setRunContactId] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<FlowExecution | null>(null);
  const [nodeLogs, setNodeLogs] = useState<FlowNodeLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [savedFlowId, setSavedFlowId] = useState<string | undefined>(flowId);

  useEffect(() => {
    const nextNodes = initialNodes && (initialNodes as Node[]).length > 0
      ? (initialNodes as Node[])
      : [defaultStartNode];
    const nextEdges = (initialEdges as Edge[]) || [];

    setNodes(layoutNodesLeftToRight(nextNodes, nextEdges));
    setEdges(nextEdges);
    setSelectedNode(null);
    setSavedFlowId(flowId);
  }, [initialNodes, initialEdges, flowId, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        type: "flowEdge",
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
      } as Edge;
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const handleAddNode = useCallback(
    (nodeType: string, position?: { x: number; y: number }) => {
      const template = NODE_TEMPLATES.find((t) => t.type === nodeType);
      if (!template) return;

      const pos = position
        ? position
        : reactFlowInstance
          ? reactFlowInstance.screenToFlowPosition({
              x: window.innerWidth / 2 - 100,
              y: window.innerHeight / 2 - 100,
            })
          : { x: 400, y: 250 };

      nodeIdCounter++;
      const newNode: Node = {
        id: `node-${nodeIdCounter}-${Date.now()}`,
        type: "flowNode",
        position: pos,
        data: {
          label: template.label,
          category: template.category,
          icon: template.icon,
          description: template.description,
          config: { ...template.defaultConfig },
          color: template.color,
          nodeType: template.type,
        } satisfies FlowNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const handleBuildFlow = useCallback(
    (flowDef: { nodes: { id: string; type: string }[]; edges: { source: string; target: string }[] }) => {
      const idMap = new Map<string, string>();
      const newNodes: Node[] = [];

      flowDef.nodes.forEach((n, i) => {
        const template = NODE_TEMPLATES.find((t) => t.type === n.type);
        if (!template) return;

        nodeIdCounter++;
        const realId = `node-${nodeIdCounter}-${Date.now()}-${i}`;
        idMap.set(n.id, realId);

        newNodes.push({
          id: realId,
          type: "flowNode",
          position: { x: AUTO_LAYOUT_X_START + i * AUTO_LAYOUT_X_GAP, y: AUTO_LAYOUT_Y_CENTER },
          data: {
            label: template.label,
            category: template.category,
            icon: template.icon,
            description: template.description,
            config: { ...template.defaultConfig },
            color: template.color,
            nodeType: template.type,
          } satisfies FlowNodeData,
        });
      });

      const newEdges: Edge[] = flowDef.edges
        .map((e) => {
          const source = idMap.get(e.source);
          const target = idMap.get(e.target);
          if (!source || !target) return null;
          return {
            id: `e-${source}-${target}`,
            source,
            target,
            type: "flowEdge",
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
          } as Edge;
        })
        .filter(Boolean) as Edge[];

      setNodes(layoutNodesLeftToRight(newNodes, newEdges));
      setEdges(newEdges);
    },
    [setNodes, setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setRightTab("editor");
    setShowRightPanel(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, newData: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const queryClient = useQueryClient();

  const handleSave = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para salvar."); return; }

      const triggerNode = nodes.find(
        (n: any) => n.data?.category === "trigger" || n.data?.nodeType?.startsWith("trigger_")
      );

      const payload = {
        user_id: user.id,
        name: flowName || "Novo Fluxo",
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        is_active: false,
        trigger_type: (triggerNode?.data as any)?.nodeType ?? "manual",
        trigger_config: {},
        updated_at: new Date().toISOString(),
      };

      if (savedFlowId) {
        await (supabase.from("user_flows").update(payload) as any).eq("id", savedFlowId);
      } else {
        const { data } = await (supabase.from("user_flows").insert(payload) as any).select().single();
        if (data) setSavedFlowId((data as any).id);
      }
      toast.success("Fluxo salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user_flows"] });
      if (onSave) onSave(flowName || "Novo Fluxo", nodes, edges, savedFlowId);
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Erro ao salvar fluxo.");
    }
  }, [nodes, edges, flowName, savedFlowId, onSave, queryClient]);

  const handleRun = useCallback(() => {
    if (nodes.length < 2) {
      toast.error("Adicione pelo menos 2 blocos ao fluxo");
      return;
    }
    if (!savedFlowId) {
      toast.info("Salve o fluxo antes de executar.");
      handleSave();
      return;
    }
    setShowRunModal(true);
  }, [nodes, savedFlowId, handleSave]);

  const executeFlow = useCallback(async () => {
    if (!savedFlowId) return;
    setIsExecuting(true);
    setShowRunModal(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Faça login."); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-flow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            flow_id: savedFlowId,
            trigger_type: "manual",
            test_message: runTestMessage,
            contact_identifier: runContactId || undefined,
          }),
        }
      );

      const result = await resp.json();
      if (!resp.ok) {
        toast.error(result.error || "Erro ao executar fluxo.");
      } else {
        toast.success("Fluxo executado com sucesso!");
        // Load execution logs
        setRightTab("logs");
        setShowRightPanel(true);
        loadExecutions();
      }
    } catch (e) {
      console.error("Execute error:", e);
      toast.error("Erro ao executar fluxo.");
    } finally {
      setIsExecuting(false);
      setRunTestMessage("");
      setRunContactId("");
    }
  }, [savedFlowId, runTestMessage, runContactId]);

  const loadExecutions = useCallback(async () => {
    if (!savedFlowId) return;
    const { data } = await supabase
      .from("flow_executions")
      .select("*")
      .eq("flow_id", savedFlowId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setExecutions(data as unknown as FlowExecution[]);
  }, [savedFlowId]);

  const loadNodeLogs = useCallback(async (executionId: string) => {
    const { data } = await supabase
      .from("flow_node_logs")
      .select("*")
      .eq("execution_id", executionId)
      .order("started_at", { ascending: true });
    if (data) setNodeLogs(data as unknown as FlowNodeLog[]);
  }, []);

  useEffect(() => {
    if (rightTab === "logs") loadExecutions();
  }, [rightTab, loadExecutions]);

  const handleDeploy = () => {
    if (nodes.length < 2) {
      toast.error("Adicione pelo menos 2 blocos ao fluxo");
      return;
    }
    toast.success("Fluxo publicado com sucesso! 🚀");
  };

  const handleDeleteFlow = () => {
    toast.success("Fluxo excluído");
  };

  const handleDuplicate = () => {
    if (onSave) {
      onSave(`${flowName || "Novo Fluxo"} (cópia)`, nodes, edges);
    }
    toast.success("Fluxo duplicado");
  };


  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const template = NODE_TEMPLATES.find((t) => t.type === nodeType);
      if (!template) return;

      nodeIdCounter++;
      const newNode: Node = {
        id: `node-${nodeIdCounter}-${Date.now()}`,
        type: "flowNode",
        position,
        data: {
          label: template.label,
          category: template.category,
          icon: template.icon,
          description: template.description,
          config: { ...template.defaultConfig },
          color: template.color,
          nodeType: template.type,
        } satisfies FlowNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="flex h-full">
      {/* CENTER — Canvas */}
      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            {headerLeft}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              onClick={handleSave}
            >
              <Save className="w-3 h-3" /> Salvar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              onClick={handleRun}
              disabled={isExecuting}
            >
              {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />} Executar
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-[11px] bg-primary hover:bg-primary/90"
              onClick={handleDeploy}
            >
              <Rocket className="w-3 h-3" /> Publicar
            </Button>
            <div className="w-px h-5 bg-border mx-0.5" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate} title="Duplicar">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDeleteFlow} title="Excluir">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-0.5" />
            {!showRightPanel && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowRightPanel(true)} title="Painel direito">
                <PanelRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper} onDrop={handleDrop} onDragOver={handleDragOver}>
          <FlowBottomToolbar onAddNode={handleAddNode} flowId={savedFlowId} />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={(instance) => setReactFlowInstance(instance as unknown as ReactFlowInstance)}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={["Delete", "Backspace"]}
            multiSelectionKeyCode="Shift"
            selectionOnDrag
            panOnScroll
            zoomOnDoubleClick
            edgesReconnectable
            connectionLineStyle={{ stroke: "hsl(var(--primary))", strokeWidth: 2 }}
            proOptions={{ hideAttribution: true }}
            className="bg-background [&_.react-flow__attribution]:!hidden"
            defaultEdgeOptions={{
              type: "flowEdge",
              animated: true,
              style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
            <Controls
              className="!bg-card/90 !border-border !rounded-lg !shadow-lg [&>button]:!bg-transparent [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
              showInteractive={false}
            />
          </ReactFlow>
        </div>
      </div>

      {/* RIGHT — Toolbar / Editor / Database / Tasks / Logs */}
      {showRightPanel && (
        <div className="w-[300px] border-l border-border flex-shrink-0 flex flex-col bg-card h-full overflow-hidden">
          {/* Vertical icon tabs */}
          <div className="flex items-center border-b border-border">
            {RIGHT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors relative",
                  rightTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={tab.label}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {rightTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
            <button
              onClick={() => setShowRightPanel(false)}
              className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Fechar"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === "editor" && selectedNode && (
              <FlowNodeConfig
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onUpdate={updateNodeData}
                onDelete={deleteNode}
              />
            )}
            {rightTab === "editor" && !selectedNode && (
              <FlowInfoPanel
                flowName={flowName || "Novo Fluxo"}
                nodes={nodes}
                edges={edges}
                onSelectNode={(n) => { setSelectedNode(n); }}
              />
            )}
            {rightTab === "database" && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <Database className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Base de Dados</p>
                <p className="text-xs text-muted-foreground">Gerencie tabelas e variáveis do fluxo.</p>
              </div>
            )}
            {rightTab === "tasks" && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <ListChecks className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Tarefas Agendadas</p>
                <p className="text-xs text-muted-foreground">Visualize e gerencie tarefas programadas.</p>
              </div>
            )}
            {rightTab === "logs" && (
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-border">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Logs de Execução</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {executions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                        <ScrollText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Nenhuma execução</p>
                      <p className="text-xs text-muted-foreground">Execute o fluxo para ver os logs aqui.</p>
                    </div>
                  ) : !selectedExecution ? (
                    <div className="p-2 space-y-1">
                      {executions.map((exec) => (
                        <button
                          key={exec.id}
                          onClick={() => { setSelectedExecution(exec); loadNodeLogs(exec.id); }}
                          className="w-full text-left p-2.5 rounded-lg border border-border hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-foreground">{exec.flow_name || "Execução"}</span>
                            <Badge variant={exec.status === "completed" ? "default" : exec.status === "failed" ? "destructive" : "secondary"} className="text-[9px] px-1.5">
                              {exec.status === "completed" ? "✓" : exec.status === "failed" ? "✗" : "⏳"} {exec.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{exec.trigger_type}</span>
                            <span>•</span>
                            <span>{new Date(exec.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2">
                      <button onClick={() => { setSelectedExecution(null); setNodeLogs([]); }} className="text-[10px] text-primary hover:underline mb-2 block">
                        ← Voltar
                      </button>
                      <div className="space-y-1.5">
                        {nodeLogs.map((log) => (
                          <div key={log.id} className="border border-border rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedLogs(prev => {
                                const next = new Set(prev);
                                next.has(log.id) ? next.delete(log.id) : next.add(log.id);
                                return next;
                              })}
                              className="w-full flex items-center gap-2 p-2 hover:bg-accent/20 transition-colors"
                            >
                              {log.status === "completed" ? <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> :
                               log.status === "failed" ? <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" /> :
                               log.status === "running" ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" /> :
                               <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="text-[11px] font-medium text-foreground truncate flex-1 text-left">{log.node_label || log.node_type}</span>
                              {expandedLogs.has(log.id) ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                            </button>
                            {expandedLogs.has(log.id) && (
                              <div className="px-2 pb-2 space-y-1 border-t border-border/50">
                                <div className="text-[9px] text-muted-foreground mt-1">
                                  <span>Tipo: {log.node_type}</span>
                                  {log.completed_at && log.started_at && (
                                    <span className="ml-2">Duração: {Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s</span>
                                  )}
                                </div>
                                {log.error_message && (
                                  <p className="text-[10px] text-destructive bg-destructive/10 rounded p-1.5">{log.error_message}</p>
                                )}
                                {Object.keys(log.output || {}).length > 0 && (
                                  <pre className="text-[9px] bg-muted/50 rounded p-1.5 overflow-x-auto max-h-24">{JSON.stringify(log.output, null, 2)}</pre>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Run Modal */}
      <Dialog open={showRunModal} onOpenChange={setShowRunModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Executar Fluxo</DialogTitle>
            <DialogDescription>Configure os parâmetros de teste para executar o fluxo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Mensagem de teste</Label>
              <Input value={runTestMessage} onChange={e => setRunTestMessage(e.target.value)} placeholder="Olá, gostaria de saber mais..." className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Contato de teste (opcional)</Label>
              <Input value={runContactId} onChange={e => setRunContactId(e.target.value)} placeholder="5511999999999" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunModal(false)}>Cancelar</Button>
            <Button onClick={executeFlow} disabled={isExecuting} className="gap-1.5">
              {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
