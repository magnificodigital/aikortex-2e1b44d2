import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/shared/FeatureGate";
import ModuleGate from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Monitor, Plus, Trash2, Pencil, Clock, MoreVertical, LayoutGrid, Sparkles,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveClient } from "@/hooks/use-active-client";
import { useGalleryTemplates } from "@/hooks/use-niche-templates";
import NicheFilterBar from "@/components/templates/NicheFilterBar";
import TemplateGrid from "@/components/templates/TemplateGrid";
import TemplateSearchInput from "@/components/templates/TemplateSearchInput";
import UseTemplateDialog from "@/components/templates/UseTemplateDialog";
import type { TemplateRow } from "@/types/templates";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedApp {
  id: string;
  name: string;
  description: string;
  channel: string;
  status: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

const Apps = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeClientId, isAgencyMode, activeClientName } = useActiveClient();

  const [savedApps, setSavedApps] = useState<SavedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState<TemplateRow | null>(null);

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

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from("user_apps")
      .select("id, name, description, channel, status, client_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!isAgencyMode && activeClientId) q = q.eq("client_id", activeClientId);
    q.then(({ data, error }) => {
      if (!error && data) setSavedApps(data as any);
      setLoading(false);
    });
  }, [user, activeClientId, isAgencyMode]);

  const { data: templates = [], isLoading: templatesLoading } = useGalleryTemplates({
    nicheSlug,
    category: "app",
    search,
  });

  const handleEditApp = (app: SavedApp) => {
    navigate("/app-builder", { state: { appId: app.id, channel: app.channel } });
  };

  const handleDeleteApp = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("user_apps").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir app.");
    else {
      setSavedApps((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success("App excluído.");
    }
    setDeleteId(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const contextLabel = isAgencyMode ? "Meu Workspace" : activeClientName;

  return (
    <ModuleGate moduleKey="aikortex.apps">
      <DashboardLayout>
        <FeatureGate feature="feature.saas_builder">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Apps</h1>
                <p className="text-sm text-muted-foreground">
                  Contexto: <span className="font-medium text-foreground">{contextLabel}</span>
                </p>
              </div>
              <Button
                onClick={() => navigate("/app-builder", { state: {} })}
                className="gap-2 rounded-full"
              >
                <Plus className="w-4 h-4" /> Novo App
              </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="mine">Meus Apps ({savedApps.length})</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="mine" className="mt-6">
                {!loading && savedApps.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">
                        {isAgencyMode
                          ? "Sua agência ainda não tem apps criados."
                          : `${activeClientName} ainda não tem apps. Crie a partir de um template.`}
                      </p>
                      <Button size="sm" onClick={() => setTab("templates")}>
                        Ver templates
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {savedApps.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedApps.map((app) => (
                      <div
                        key={app.id}
                        className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                        onClick={() => handleEditApp(app)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              app.channel === "whatsapp" ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                            }`}>
                              {app.channel === "whatsapp" ? <WhatsAppIcon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{app.name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{app.channel} • {app.status}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditApp(app); }}>
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(app.id); }}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" /> Atualizado em {formatDate(app.updated_at)}
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
                    Templates de apps prontos. Selecione um nicho ou busque.
                  </p>
                </div>
                <TemplateSearchInput value={search} onChange={setSearch} />
                <NicheFilterBar
                  selectedNicheSlug={nicheSlug}
                  onSelect={setNiche}
                  category="app"
                />
                <TemplateGrid
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
                  <AlertDialogTitle>Excluir App</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este app? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteApp} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </FeatureGate>
      </DashboardLayout>
    </ModuleGate>
  );
};

export default Apps;
