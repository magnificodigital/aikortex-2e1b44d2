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
  LayoutDashboard, MessageSquare, Settings, Contact,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Menu, X, Loader2,
} from "lucide-react";
import { RightPanelProvider } from "@/components/RightPanel";
import WorkspaceDashboard from "@/pages/workspace/WorkspaceDashboard";
import WorkspaceMessages from "@/pages/workspace/WorkspaceMessages";
import WorkspaceCRM from "@/pages/workspace/WorkspaceCRM";
import WorkspaceSettings from "@/pages/workspace/WorkspaceSettings";

// F1 — módulos disponíveis. Slug bate com o que a agência escolhe no wizard.
type NavItem = { key: string; label: string; icon: typeof LayoutDashboard; path: string };

const ALL_NAV_ITEMS: NavItem[] = [
  { key: "workspace.dashboard", label: "Dashboard",   icon: LayoutDashboard, path: "/workspace" },
  { key: "workspace.messages",  label: "Mensagens",   icon: MessageSquare,   path: "/workspace/messages" },
  { key: "workspace.crm",       label: "CRM",         icon: Contact,         path: "/workspace/crm" },
  { key: "workspace.settings",  label: "Configurações", icon: Settings,      path: "/workspace/settings" },
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
  // Settings sempre disponível (perfil/senha) mesmo que agência não habilite
  enabledSet.add("workspace.settings");
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => enabledSet.has(item.key));

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

          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            {visibleNavItems.map(item => (
              <Link key={item.path} to={item.path} className={linkClasses(isActive(item.path))}>
                <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.path) ? "text-primary" : ""}`} />
                {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
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
              element={enabledSet.has("workspace.dashboard")
                ? <WorkspaceDashboard clientId={clientRecord?.id} clientName={clientRecord?.client_name} />
                : <Navigate to="/workspace/settings" replace />}
            />
            <Route
              path="messages"
              element={enabledSet.has("workspace.messages")
                ? <WorkspaceMessages clientId={clientRecord?.id} />
                : <ModuleNotAvailable />}
            />
            <Route
              path="crm"
              element={enabledSet.has("workspace.crm")
                ? <WorkspaceCRM clientId={clientRecord?.id} />
                : <ModuleNotAvailable />}
            />
            <Route path="settings" element={<WorkspaceSettings />} />
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
