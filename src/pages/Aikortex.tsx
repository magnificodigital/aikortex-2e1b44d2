import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Trash2, Pencil, Clock, MoreVertical, Sparkles, LayoutGrid, ArrowRight,
  Copy, ChevronRight, ArrowLeft, Bot, Users,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUserAgents, type UserAgent } from "@/hooks/use-user-agents";
import { useActiveClient } from "@/hooks/use-active-client";
import { useGalleryTemplates, useNichesWithCounts } from "@/hooks/use-niche-templates";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { TemplateRow } from "@/types/templates";
import { agentTypeLabel } from "@/lib/agent-type-labels";
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

  const { agents, loading, deleteAgent, saveAgent } = useUserAgents({ clientId: activeClientId, isAgencyMode });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fase 3 — cap de rascunhos por agência (5) + validade (7 dias).
  // Rascunho = agente ainda não publicado (status != online/active).
  const DRAFT_CAP = 5;
  const DRAFT_TTL_DAYS = 7;
  const isPublishedStatus = (s: string) => s === "online" || s === "active";
  const draftAgeDays = (a: UserAgent) => (Date.now() - new Date(a.created_at).getTime()) / 86_400_000;
  const isDraftExpired = (a: UserAgent) => !isPublishedStatus(a.status) && draftAgeDays(a) > DRAFT_TTL_DAYS;
  const activeDraftCount = useMemo(
    () => agents.filter((a) => !isPublishedStatus(a.status) && !isDraftExpired(a)).length,
    [agents]
  );

  const tab = (searchParams.get("tab") === "templates" && isAgencyMode) ? "templates" : "mine";
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
  const { data: nichesData } = useNichesWithCounts("agent");

  const [useTemplate, setUseTemplate] = useState<TemplateRow | null>(null);
  const [newAgentOpen, setNewAgentOpen] = useState(false);
  const [newAgentView, setNewAgentView] = useState<"root" | "describe" | "duplicate">("root");
  const [desc, setDesc] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  // Abre a bifurcação "como você quer criar?" (descrever vs do zero).
  const handleNewCustom = () => {
    if (activeDraftCount >= DRAFT_CAP) {
      toast.error(`Você tem ${DRAFT_CAP} rascunhos abertos. Publique ou exclua um agente para criar outro.`);
      return;
    }
    setDesc("");
    setNewAgentView("root");
    setNewAgentOpen(true);
  };

  // Duplicar um agente existente → clona config num novo rascunho e abre.
  const handleDuplicate = async (src: UserAgent) => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const created = await saveAgent({
        name: `${src.name} (cópia)`,
        agent_type: src.agent_type,
        description: src.description || "",
        avatar_url: src.avatar_url || "",
        model: (src as any).model || "gemini-2.5-flash",
        provider: (src as any).provider || "auto",
        status: "configuring",
        config: (src as any).config || {},
        ...(activeClientId ? { client_id: activeClientId } : {}),
      });
      if (created?.id) {
        setNewAgentOpen(false);
        navigate(`/aikortex/agents/${created.id}`);
      }
    } finally {
      setDuplicating(false);
    }
  };

  // manual=false → assistente conduz (wizard). manual=true → vai direto pro
  // painel de config, sem o assistente iniciar sozinho.
  // description → Fase 2: descrever → rascunho na hora (initialPrompt alimenta o
  // wizard igual ao caminho da Home; a IA já parte pra montar em vez de só perguntar).
  const startAgent = (manual: boolean, description?: string) => {
    setNewAgentOpen(false);
    const newId = `new-${Date.now()}`;
    navigate(`/aikortex/agents/${newId}`, {
      state: {
        fromTemplate: false,
        agentType: "Custom",
        agentName: "Novo Agente",
        manual,
        ...(description?.trim() ? { initialPrompt: description.trim() } : {}),
      },
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
          {isAgencyMode && (
            <Button onClick={handleNewCustom} className="gap-2 rounded-full">
              <Plus className="w-4 h-4" /> Novo Agente
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="relative h-11 p-1 bg-card/60 backdrop-blur-sm border border-border rounded-full inline-flex gap-1">
            <TabsTrigger
              value="mine"
              className="relative z-10 rounded-full px-5 h-9 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)] transition-all"
            >
              <span className="inline-flex items-center gap-2">
                {isAgencyMode ? "Meus Agentes" : "Agentes contratados"}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10 data-[state=active]:bg-primary-foreground/15">
                  {agents.length}
                </span>
              </span>
            </TabsTrigger>
            {isAgencyMode && (
              <TabsTrigger
                value="templates"
                className="relative z-10 rounded-full px-5 h-9 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)] transition-all"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Templates
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="mine" className="mt-6">
            {!loading && agents.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {isAgencyMode ? (
                    <>
                      <p className="text-sm font-medium">
                        Sua agência ainda não tem agentes. Crie a partir de um template.
                      </p>
                      <Button size="sm" onClick={() => setTab("templates")}>
                        Ver templates
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      {activeClientName} ainda não tem agentes contratados.
                    </p>
                  )}
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
                            <p className="text-[10px] text-muted-foreground">
                              {agentTypeLabel(agent.agent_type)} • {agent.status === "online" ? "Online" : "Configurando"}
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
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Atualizado em {formatDate(agent.updated_at)}
                      </span>
                      {!isPublishedStatus(agent.status) && (
                        isDraftExpired(agent) ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-destructive/40 text-destructive">
                            Rascunho expirado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400">
                            Expira em {Math.max(1, Math.ceil(DRAFT_TTL_DAYS - draftAgeDays(agent)))}d
                          </Badge>
                        )
                      )}
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
              activeNiche={nicheSlug}
              onNicheChange={setNiche}
              allNiches={nichesData?.niches.map((n) => ({ slug: n.slug, name_pt: n.name_pt, icon: n.icon }))}
            />
          </TabsContent>
        </Tabs>

        {/* Bifurcação: como criar o agente — assistente (IA monta) ou do zero (manual). */}
        <Dialog open={newAgentOpen} onOpenChange={setNewAgentOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
            {/* ── View: Por onde começar (raiz) ── */}
            {newAgentView === "root" && (
              <>
                <DialogHeader>
                  <DialogTitle>Por onde começar</DialogTitle>
                  <DialogDescription>
                    Escolha a base do seu agente. Dá pra mudar tudo depois.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Pedir para IA (recomendado) → vai DIRETO pra tela de criação */}
                  <button
                    type="button"
                    onClick={() => startAgent(false)}
                    className="group text-left rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors p-5 min-h-[150px] flex flex-col gap-3"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary grid place-items-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">Pedir para IA</span>
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0">Recomendado</Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                        Você descreve e a IA monta o agente com você.
                      </p>
                    </div>
                  </button>

                  {/* Modelos prontos → aba de templates */}
                  <button
                    type="button"
                    onClick={() => { setNewAgentOpen(false); setTab("templates"); }}
                    className="group text-left rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors p-5 min-h-[150px] flex flex-col gap-3"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">Modelos prontos</span>
                        {templates.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{templates.length}</Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                        Comece de um agente já configurado e ajuste.
                      </p>
                    </div>
                  </button>

                  {/* Duplicar um agente existente → sub-view */}
                  <button
                    type="button"
                    onClick={() => {
                      if (agents.length === 0) { toast.error("Você ainda não tem agentes pra duplicar."); return; }
                      setNewAgentView("duplicate");
                    }}
                    className="group text-left rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors p-5 min-h-[150px] flex flex-col gap-3"
                  >
                    <div className="w-11 h-11 rounded-lg bg-foreground/10 text-foreground grid place-items-center">
                      <Copy className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">Duplicar existente</span>
                        {agents.length > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{agents.length}</Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                        Clone um agente que já roda em produção.
                      </p>
                    </div>
                  </button>

                  {/* Do zero */}
                  <button
                    type="button"
                    onClick={() => startAgent(true)}
                    className="group text-left rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors p-5 min-h-[150px] flex flex-col gap-3"
                  >
                    <div className="w-11 h-11 rounded-lg bg-muted text-muted-foreground grid place-items-center">
                      <Pencil className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground">Do zero</span>
                      <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                        Você mesmo escreve e ajusta tudo no painel.
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* ── View: Duplicar ── */}
            {newAgentView === "duplicate" && (
              <>
                <DialogHeader>
                  <button
                    type="button"
                    onClick={() => setNewAgentView("root")}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit mb-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <DialogTitle>Duplicar um agente</DialogTitle>
                  <DialogDescription>
                    Escolha um agente pra clonar. Ele vira um novo rascunho editável.
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-1 space-y-2 max-h-[55vh] overflow-y-auto">
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={duplicating}
                      onClick={() => handleDuplicate(a)}
                      className="w-full text-left rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors p-3 flex items-center gap-3 disabled:opacity-50"
                    >
                      <img src={getAvatarSrc(a)} alt={a.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{agentTypeLabel(a.agent_type)}</p>
                      </div>
                      <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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
