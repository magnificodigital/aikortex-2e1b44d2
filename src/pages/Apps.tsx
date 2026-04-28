import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/shared/FeatureGate";
import ModuleGate from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Monitor, Heart, Target, Building2,
  GraduationCap, Dumbbell, Briefcase, BookOpen, Hotel, ShoppingBag, Globe,
  Plus, Trash2, Pencil, Clock, MoreVertical,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AppChannel = "whatsapp" | "web";

interface SavedApp {
  id: string;
  name: string;
  description: string;
  channel: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const showcaseApps = [
  { name: "CliniFlow", cat: "Saúde", desc: "Triagem, agendamento e reativação de pacientes.", icon: Heart, channels: ["whatsapp", "web"] as AppChannel[] },
  { name: "LeadOrbit", cat: "Vendas", desc: "Qualificação de leads com follow-up automatizado.", icon: Target, channels: ["whatsapp"] as AppChannel[] },
  { name: "EstatePilot", cat: "CRM", desc: "Perfil do comprador, oportunidades e follow-ups para imobiliárias.", icon: Building2, channels: ["whatsapp", "web"] as AppChannel[] },
  { name: "NutriPath", cat: "Saúde", desc: "Plano alimentar, aderência e acompanhamento nutricional.", icon: Heart, channels: ["whatsapp"] as AppChannel[] },
  { name: "TrainSphere", cat: "Fitness", desc: "Treino, check-ins e ajustes contínuos.", icon: Dumbbell, channels: ["whatsapp"] as AppChannel[] },
  { name: "SkillLoop", cat: "Educação", desc: "Microlições, exercícios e adaptação por nível.", icon: GraduationCap, channels: ["whatsapp", "web"] as AppChannel[] },
  { name: "CloserOS", cat: "Vendas", desc: "Recuperação comercial, objeções e fechamento.", icon: ShoppingBag, channels: ["whatsapp"] as AppChannel[] },
  { name: "OnboardFlow", cat: "Operações", desc: "Onboarding guiado e ativação de novos clientes.", icon: Briefcase, channels: ["whatsapp", "web"] as AppChannel[] },
  { name: "CaseRoute", cat: "Jurídico", desc: "Triagem e organização para escritórios jurídicos.", icon: Building2, channels: ["whatsapp"] as AppChannel[] },
  { name: "HostMind", cat: "Hotelaria", desc: "Suporte ao hóspede, roteiros e recomendações.", icon: Hotel, channels: ["whatsapp", "web"] as AppChannel[] },
  { name: "PulseBoard", cat: "Conteúdo", desc: "Curadoria e distribuição de conteúdo personalizado.", icon: BookOpen, channels: ["web"] as AppChannel[] },
  { name: "MentorGrid", cat: "Mentoria", desc: "Acompanhamento de alunos com metas e check-ins.", icon: GraduationCap, channels: ["whatsapp", "web"] as AppChannel[] },
];

const Apps = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [channel, setChannel] = useState<AppChannel>("whatsapp");
  const [savedApps, setSavedApps] = useState<SavedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("user_apps")
      .select("id, name, description, channel, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSavedApps(data);
        setLoading(false);
      });
  }, [user]);

  const filtered = showcaseApps.filter((a) => a.channels.includes(channel));

  const handleUseTemplate = (app: typeof showcaseApps[0]) => {
    navigate("/app-builder", { state: { initialPrompt: app.desc, channel: app.channels[0], templateName: app.name } });
  };

  const handleEditApp = (app: SavedApp) => {
    navigate("/app-builder", { state: { appId: app.id, channel: app.channel } });
  };

  const handleDeleteApp = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("user_apps").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir app."); }
    else {
      setSavedApps((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success("App excluído.");
    }
    setDeleteId(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <ModuleGate moduleKey="aikortex.apps">
    <DashboardLayout>
      <FeatureGate feature="feature.saas_builder">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Apps</h1>
            <p className="text-sm text-muted-foreground">
              Crie microsaas conversacionais ou aplicativos web e mobile completos.
            </p>
          </div>
          <Button
            onClick={() => navigate("/app-builder", { state: { channel } })}
            className="gap-2 rounded-full"
          >
            <Plus className="w-4 h-4" /> Novo App
          </Button>
        </div>

        {/* Saved Apps */}
        {!loading && savedApps.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-foreground mb-3">Meus Apps</h2>
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
                    <Clock className="w-3 h-3" />
                    Atualizado em {formatDate(app.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel toggle */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Modelos</h2>
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setChannel("whatsapp")}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 transition-all flex-1 max-w-xs ${
              channel === "whatsapp"
                ? "border-green-500 bg-green-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              channel === "whatsapp" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
            }`}>
              <WhatsAppIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">WhatsApp</p>
              <p className="text-[11px] text-muted-foreground">Conversacional e operacional</p>
            </div>
          </button>

          <button
            onClick={() => setChannel("web")}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 transition-all flex-1 max-w-xs ${
              channel === "web"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              channel === "web" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              <Monitor className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Web App</p>
              <p className="text-[11px] text-muted-foreground">Dashboard, portal e sistema</p>
            </div>
          </button>
        </div>

        {/* Apps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => (
            <div
              key={app.name}
              onClick={() => handleUseTemplate(app)}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <app.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex gap-1">
                  {app.channels.map((ch) => (
                    <span key={ch} className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      ch === "whatsapp" ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                    }`}>
                      {ch === "whatsapp" ? <WhatsAppIcon className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    </span>
                  ))}
                </div>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{app.name}</h3>
              <p className="text-[10px] text-primary/70 font-medium mb-1.5">{app.cat}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{app.desc}</p>
              <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Criar semelhante <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Delete confirmation */}
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
