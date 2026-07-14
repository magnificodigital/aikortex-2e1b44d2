import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import {
  Bot, MessageSquare, Settings, Contact, Phone as PhoneIcon, AppWindow,
  Users, ShoppingCart, DollarSign, UserCheck, CheckSquare,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Menu, X, Loader2, Sparkles,
} from "lucide-react";
import { RightPanelProvider } from "@/components/RightPanel";
import WorkspaceMessages from "@/pages/workspace/WorkspaceMessages";
import WorkspaceCRM from "@/pages/workspace/WorkspaceCRM";
import WorkspaceSettings from "@/pages/workspace/WorkspaceSettings";
import WorkspacePlaceholder from "@/pages/workspace/WorkspacePlaceholder";

// Sidebar do cliente espelha exatamente os 10 módulos liberáveis pela agência.
// Mesma estrutura (Aikortex + Gestão) que ela vê no switcher modo cliente.
type NavItem = { key: string; label: string; icon: typeof Bot; path: string; group: "Aikortex" | "Gestão" };

const ALL_NAV_ITEMS: NavItem[] = [
  // Aikortex
  // stark.copilot: habilitado quando a agencia VENDE o Stark pro cliente
  // (edge stark-subscribe-client adiciona a key em enabled_modules).
  { key: "stark.copilot",      group: "Aikortex", label: "Stark",      icon: Zap,            path: "/workspace/stark" },
  { key: "aikortex.agentes",   group: "Aikortex", label: "Agentes",    icon: Bot,            path: "/workspace/agents" },
  { key: "aikortex.crm",       group: "Aikortex", label: "CRM",        icon: Contact,        path: "/workspace/crm" },
  { key: "aikortex.ligacoes",  group: "Aikortex", label: "Ligações",   icon: PhoneIcon,      path: "/workspace/calls" },
  { key: "aikortex.apps",      group: "Aikortex", label: "Apps",       icon: AppWindow,      path: "/workspace/apps" },
  { key: "aikortex.mensagens", group: "Aikortex", label: "Mensagens",  icon: MessageSquare,  path: "/workspace/messages" },
  // Gestão
  { key: "gestao.clientes",    group: "Gestão",   label: "Clientes",   icon: Users,          path: "/workspace/clients" },
  { key: "gestao.vendas",      group: "Gestão",   label: "Vendas",     icon: ShoppingCart,   path: "/workspace/sales" },
  { key: "gestao.financeiro",  group: "Gestão",   label: "Financeiro", icon: DollarSign,     path: "/workspace/financial" },
  { key: "gestao.equipe",      group: "Gestão",   label: "Equipe",     icon: UserCheck,      path: "/workspace/team" },
  { key: "gestao.tarefas",     group: "Gestão",   label: "Tarefas",    icon: CheckSquare,    path: "/workspace/tasks" },
];

const Workspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, profile, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Carrega o próprio registro do cliente pra saber enabled_modules.
  // Policy "client_view_own_record" garante que cliente lê só a si.
  const { data: clientRecord, isLoading: loadingClient } = useQuery({
    queryKey: ["workspace-client-record", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_clients")
        .select("id, client_name, enabled_modules")
        .eq("client_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enabledSet = new Set(clientRecord?.enabled_modules ?? []);
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => enabledSet.has(item.key));
  const visibleAikortex = visibleNavItems.filter((i) => i.group === "Aikortex");
  const visibleGestao = visibleNavItems.filter((i) => i.group === "Gestão");

  const isActive = (path: string) =>
    path === "/workspace" ? location.pathname === "/workspace" : location.pathname.startsWith(path);

  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      active ? "bg-primary/10 text-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
    }`;

  useEffect(() => { if (isMobile) setMobileSidebarOpen(false); }, [location.pathname]);

  if (loadingClient) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <RightPanelProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        {isMobile && mobileSidebarOpen && (
          <button className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
        )}

        <aside className={`flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-64 ${mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`
            : collapsed ? "w-16" : "w-56"
        }`}>
          <div className="flex h-14 items-center border-b border-sidebar-border px-4 justify-between">
            {(!collapsed || isMobile) && (
              <img src={theme === "dark" ? aikortexLogoWhite : aikortexLogoBlack} alt="Aikortex" className="h-7 w-auto" />
            )}
            {isMobile && (
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 text-sidebar-foreground"><X className="h-4 w-4" /></button>
            )}
          </div>

          {(!collapsed || isMobile) && (
            <div className="px-4 py-3 border-b border-sidebar-border">
              <p className="text-xs text-muted-foreground">Olá, {profile?.full_name?.split(" ")[0] ?? "Cliente"}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Workspace do cliente</p>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
            {(["Aikortex", "Gestão"] as const).map((group) => {
              const items = group === "Aikortex" ? visibleAikortex : visibleGestao;
              if (items.length === 0) return null;
              return (
                <div key={group} className="space-y-0.5">
                  {(!collapsed || isMobile) && (
                    <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">{group}</div>
                  )}
                  {items.map(item => (
                    <Link key={item.path} to={item.path} className={linkClasses(isActive(item.path))}>
                      <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.path) ? "text-primary" : ""}`} />
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </Link>
                  ))}
                </div>
              );
            })}
            {visibleNavItems.length === 0 && (!collapsed || isMobile) && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                Nenhum módulo liberado.<br />Fale com sua agência.
              </div>
            )}
          </nav>

          <div className="space-y-0.5 border-t border-sidebar-border px-2 py-2">
            <button onClick={toggle} className={`${linkClasses(false)} w-full`}>
              {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              {(!collapsed || isMobile) && <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>}
            </button>
            <button onClick={async () => { await signOut(); navigate("/"); }} className={`${linkClasses(false)} w-full`}>
              <LogOut className="w-4 h-4 shrink-0 text-destructive" />
              {(!collapsed || isMobile) && <span className="text-destructive">Sair</span>}
            </button>
            {!isMobile && (
              <button onClick={() => setCollapsed(!collapsed)} className={`${linkClasses(false)} w-full`}>
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Recolher</span></>}
              </button>
            )}
          </div>
        </aside>

        <main className="relative flex-1 min-w-0 overflow-y-auto bg-background">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg px-3 py-2">
            {isMobile ? (
              <button onClick={() => setMobileSidebarOpen(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </button>
            ) : <div />}
            <div />
          </div>

          <Routes>
            <Route
              index
              element={visibleNavItems[0]
                ? <Navigate to={visibleNavItems[0].path} replace />
                : <WorkspaceSettings />}
            />
            <Route path="settings" element={<WorkspaceSettings />} />
            {ALL_NAV_ITEMS.map((item) => {
              if (!enabledSet.has(item.key)) {
                return <Route key={item.key} path={item.path.replace("/workspace/", "")} element={<ModuleNotAvailable />} />;
              }
              let el: JSX.Element;
              if (item.key === "aikortex.crm") el = <WorkspaceCRM clientId={clientRecord?.id} />;
              else if (item.key === "aikortex.mensagens") el = <WorkspaceMessages clientId={clientRecord?.id} />;
              else el = <WorkspacePlaceholder label={item.label} />;
              return <Route key={item.key} path={item.path.replace("/workspace/", "")} element={el} />;
            })}
            <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Routes>
        </main>
      </div>
    </RightPanelProvider>
  );
};

const ModuleNotAvailable = () => (
  <div className="flex items-center justify-center min-h-[60vh] p-6">
    <div className="text-center max-w-md space-y-3">
      <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
        <X className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Módulo não disponível</h2>
      <p className="text-sm text-muted-foreground">
        Sua agência ainda não liberou esta área pra você. Entre em contato com ela pra ativar.
      </p>
    </div>
  </div>
);

export default Workspace;
