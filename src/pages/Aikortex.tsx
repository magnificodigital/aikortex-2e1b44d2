import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Trash2, Pencil, Clock, MoreVertical, Sparkles, LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserAgents, type UserAgent } from "@/hooks/use-user-agents";
import { useActiveClient } from "@/hooks/use-active-client";
import { useGalleryTemplates } from "@/hooks/use-niche-templates";
import TemplateNicheCarousel from "@/components/templates/TemplateNicheCarousel";
import TemplateSearchInput from "@/components/templates/TemplateSearchInput";
import UseTemplateDialog from "@/components/templates/UseTemplateDialog";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { TemplateRow } from "@/types/templates";
import avatar1 from "@/assets/avatars/avatar-1.png";


const PROVIDER_BADGE: Record<string, { label: string; className: string }> = {
  anthropic: { label: "Claude", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  openai:    { label: "GPT",    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  gemini:    { label: "Gemini", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  openrouter:{ label: "Router", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  auto:      { label: "Auto",   className: "bg-muted text-muted-foreground border-border" },
};

const Aikortex = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeClientId, isAgencyMode, activeClientName } = useActiveClient();

  const { agents, loading, deleteAgent } = useUserAgents({ clientId: activeClientId, isAgencyMode });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const tab = searchParams.get("tab") === "templates" ? "templates" : "mine";
  const nicheSlug = searchParams.get("nicho");
  const search = searchParams.get("busca") ?? "";

  const setTab = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next === "mine") sp.delete("tab"); else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };
  const setNiche = (slug: string | null) => {
    const sp = new URLSearchParams(searchParams);
    if (slug) sp.set("nicho", slug); else sp.delete("nicho");
    setSearchParams(sp, { replace: true });
  };
  const setSearch = (v: string) => {
    const sp = new URLSearchParams(searchParams);
    if (v) sp.set("busca", v); else sp.delete("busca");
    setSearchParams(sp, { replace: true });
  };

  const { data: templates = [], isLoading: templatesLoading } = useGalleryTemplates({
    nicheSlug,
    category: "agent",
    search,
  });

  const [useTemplate, setUseTemplate] = useState<TemplateRow | null>(null);

  const handleNewCustom = () => {
    const newId = `new-${Date.now()}`;
    navigate(`/aikortex/agents/${newId}`, {
      state: { fromTemplate: false, agentType: "Custom", agentName: "Novo Agente" },
    });
  };

  const handleDeleteAgent = async () => {
    if (!deleteId) return;
    const success = await deleteAgent(deleteId);
    if (success) toast.success("Agente excluído.");
    setDeleteId(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const getAvatarSrc = (agent: UserAgent) => agent.avatar_url || avatar1;

  const contextLabel = isAgencyMode ? "Meu Workspace" : activeClientName;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Agentes IA</h1>
            <p className="text-sm text-muted-foreground">
              {contextLabel} <span className="text-muted-foreground/60">›</span> Agentes
            </p>
          </div>
          <Button onClick={handleNewCustom} className="gap-2 rounded-full">
            <Plus className="w-4 h-4" /> Novo Agente
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="mine">Meus Agentes ({agents.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-6">
            {!loading && agents.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    {isAgencyMode
                      ? "Sua agência ainda não tem agentes. Crie a partir de um template."
                      : `${activeClientName} ainda não tem agentes. Crie a partir de um template.`}
                  </p>
                  <Button size="sm" onClick={() => setTab("templates")}>
                    Ver templates
                  </Button>
                </CardContent>
              </Card>
            )}

            {agents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                    onClick={() => navigate(`/aikortex/agents/${agent.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={getAvatarSrc(agent)}
                          alt={agent.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-bold text-foreground">{agent.name}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {agent.agent_type} • {agent.status === "online" ? "Online" : "Configurando"}
                            </p>
                            {(() => {
                              const badge = PROVIDER_BADGE[agent.provider || "auto"] || PROVIDER_BADGE.auto;
                              return (
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${badge.className}`}>
                                  {badge.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/aikortex/agents/${agent.id}`); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(agent.id); }}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {agent.description || "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" /> Atualizado em {formatDate(agent.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Templates de agentes prontos. Selecione um nicho ou busque.
              </p>
            </div>
            <TemplateSearchInput value={search} onChange={setSearch} />
            <TemplateNicheCarousel
              templates={templates}
              loading={templatesLoading}
              onUseTemplate={(t) => setUseTemplate(t)}
            />
          </TabsContent>
        </Tabs>

        <UseTemplateDialog
          template={useTemplate}
          open={!!useTemplate}
          onOpenChange={(o) => !o && setUseTemplate(null)}
        />

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Aikortex;
