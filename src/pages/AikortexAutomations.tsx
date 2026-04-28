import { useState, useCallback, useEffect } from "react";
import ModuleGate from "@/components/shared/ModuleGate";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Workflow, Plus, ArrowLeft, Trash2, Pencil, Clock, MoreVertical, Power, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { SavedFlow, FlowFolder, FlowTemplate } from "@/types/flow-builder";
import { FLOW_TEMPLATES } from "@/types/flow-builder";
import FlowCanvas from "@/components/flows/FlowCanvas";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFlows } from "@/hooks/use-flows";

const AikortexAutomations = () => {
  const location = useLocation();
  const { flows, isLoading, toggleFlow, deleteFlow } = useFlows();

  const [copilotPrompt, setCopilotPrompt] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [buildingFlow, setBuildingFlow] = useState<{
    name: string;
    nodes?: unknown[];
    edges?: unknown[];
    flowId?: string;
  } | null>(null);

  // Folders still local (not in DB yet)
  const [folders, setFolders] = useState<FlowFolder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("aikortex_folders") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const state = location.state as any;
    if (state?.initialPrompt && !buildingFlow) {
      setCopilotPrompt(state.initialPrompt);
      setBuildingFlow({ name: "Novo Fluxo" });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const persistFolders = useCallback((next: FlowFolder[]) => {
    setFolders(next);
    localStorage.setItem("aikortex_folders", JSON.stringify(next));
  }, []);

  const handleSelectTemplate = (tpl: FlowTemplate) => {
    setBuildingFlow({ name: tpl.name, nodes: tpl.nodes, edges: tpl.edges });
  };

  const handleNewBlank = () => {
    setBuildingFlow({ name: "Novo Fluxo" });
  };

  const handleSkipToCanvas = () => {
    setBuildingFlow({ name: "Novo Fluxo" });
  };

  const handleOpenFlow = (flow: SavedFlow) => {
    setBuildingFlow({
      name: flow.name,
      nodes: flow.nodes,
      edges: flow.edges,
      flowId: flow.id,
    });
  };

  const handleSaveFlow = useCallback(
    (name: string, nodes: unknown[], edges: unknown[], flowId?: string) => {
      // This is called from FlowCanvas after it saves to DB
      toast.success("Fluxo salvo!");
    },
    []
  );

  const handleToggleFlow = (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    const newActive = flow?.status !== "active";
    toggleFlow.mutate(
      { flowId, isActive: newActive },
      {
        onSuccess: () => toast.success(newActive ? "Fluxo ativado" : "Fluxo pausado"),
      }
    );
  };

  const handleDeleteFlow = (flowId: string) => {
    deleteFlow.mutate(flowId);
  };

  // Folder CRUD
  const handleCreateFolder = (name: string) => {
    persistFolders([...folders, { id: `folder-${Date.now()}`, name, createdAt: new Date().toISOString() }]);
  };
  const handleRenameFolder = (folderId: string, name: string) => {
    persistFolders(folders.map((f) => (f.id === folderId ? { ...f, name } : f)));
  };
  const handleDeleteFolder = (folderId: string) => {
    persistFolders(folders.filter((f) => f.id !== folderId));
    toast.success("Pasta excluída");
  };
  const handleMoveFlow = (_flowId: string, _folderId: string | null) => {
    toast.info("Mover fluxo entre pastas (em breve)");
  };

  if (buildingFlow) {
    return (
      <ModuleGate moduleKey="aikortex.flows">
        <div className="flex flex-col h-screen">
          <div className="flex-1 overflow-hidden">
            <FlowCanvas
              initialNodes={buildingFlow.nodes}
              initialEdges={buildingFlow.edges}
              flowName={buildingFlow.name}
              flowId={buildingFlow.flowId}
              onSave={handleSaveFlow}
              flows={flows}
              onOpenFlow={handleOpenFlow}
              onNewFlow={handleNewBlank}
              initialPrompt={copilotPrompt || undefined}
              headerLeft={
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBuildingFlow(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                    <Workflow className="w-3 h-3 text-primary" />
                  </div>
                  <Input
                    value={buildingFlow.name}
                    onChange={(e) => setBuildingFlow((p) => p && { ...p, name: e.target.value })}
                    className="h-7 w-[200px] text-xs font-medium bg-transparent border-transparent hover:border-border focus:border-border"
                  />
                </>
              }
            />
          </div>
        </div>
      </ModuleGate>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <ModuleGate moduleKey="aikortex.flows">
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Automações</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Fluxos visuais que conectam agentes, ferramentas e ações.
              </p>
            </div>
            <Button onClick={handleNewBlank} size="sm" className="gap-2 rounded-full h-9 px-4">
              <Plus className="w-3.5 h-3.5" /> Novo Fluxo
            </Button>
          </div>

          {/* My Flows */}
          {!isLoading && flows.length > 0 && (
            <section className="mb-12">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Meus Fluxos
                </h2>
                <span className="text-[10px] text-muted-foreground">{flows.length} {flows.length === 1 ? "fluxo" : "fluxos"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {flows.map((flow) => {
                  const isActive = flow.status === "active";
                  return (
                    <div
                      key={flow.id}
                      onClick={() => handleOpenFlow(flow)}
                      className="group relative rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-accent/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Workflow className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isActive ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[hsl(var(--success))]" : "bg-muted-foreground/40"}`} />
                            {isActive ? "Ativo" : "Rascunho"}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenFlow(flow); }}>
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleFlow(flow.id); }}>
                                <Power className="w-3.5 h-3.5 mr-2" /> {isActive ? "Pausar" : "Ativar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(flow.id); }}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-1 mb-1">{flow.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{flow.nodes.length} blocos</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(flow.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Templates showcase */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Templates
              </h2>
              <span className="text-[10px] text-muted-foreground">{FLOW_TEMPLATES.length} disponíveis</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FLOW_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="group rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-accent/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-base">
                      {tpl.icon || "⚡"}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{tpl.nodes.length} blocos</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{tpl.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                    {tpl.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{tpl.category}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Empty state */}
          {!isLoading && flows.length === 0 && (
            <div className="mt-12 rounded-xl border border-dashed border-border/60 p-10 text-center">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Workflow className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhum fluxo criado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha um template acima ou comece do zero.
              </p>
            </div>
          )}

          {/* Delete confirmation */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Fluxo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { if (deleteId) { handleDeleteFlow(deleteId); setDeleteId(null); } }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    </ModuleGate>
  );
};

export default AikortexAutomations;
