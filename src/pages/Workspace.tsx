import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import {
  LayoutDashboard, Users, CheckSquare, DollarSign, FileText, Settings,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Menu, X, Contact,
} from "lucide-react";
import { RightPanelProvider } from "@/components/RightPanel";

type NavItem = { label: string; icon: typeof LayoutDashboard; path: string };

const clientNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/workspace" },
  { label: "CRM", icon: Contact, path: "/workspace/crm" },
  { label: "Projetos", icon: Users, path: "/workspace/projects" },
  { label: "Tarefas", icon: CheckSquare, path: "/workspace/tasks" },
  { label: "Financeiro", icon: DollarSign, path: "/workspace/financial" },
  { label: "Contratos", icon: FileText, path: "/workspace/contracts" },
  { label: "Configurações", icon: Settings, path: "/workspace/settings" },
];

const Workspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { profile, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      active ? "bg-primary/10 text-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
    }`;

  useEffect(() => { if (isMobile) setMobileSidebarOpen(false); }, [location.pathname]);

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
            {clientNavItems.map(item => (
              <Link key={item.path} to={item.path} className={linkClasses(isActive(item.path))}>
                <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.path) ? "text-primary" : ""}`} />
                {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
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

          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Bem-vindo ao seu workspace</h1>
            <p className="text-muted-foreground">Este é o seu espaço de trabalho. Use o menu lateral para navegar entre os módulos disponíveis.</p>
          </div>
        </main>
      </div>
    </RightPanelProvider>
  );
};

export default Workspace;
