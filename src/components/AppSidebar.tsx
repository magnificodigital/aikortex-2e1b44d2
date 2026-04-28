import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useModuleAccess } from "@/hooks/use-module-access";
import { useMonthlyUsage } from "@/hooks/use-monthly-usage";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import aikortexIconWhite from "@/assets/aikortex-icon-white.png";
import aikortexIconBlack from "@/assets/aikortex-icon-black.png";
import { LogOut, Lock, Key, Activity, Phone as PhoneIcon } from "lucide-react";
import {
  LayoutDashboard,
  Home,
  Users,
  CheckSquare,
  DollarSign,
  FileText,
  Bot,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Contact,
  UserCheck,
  Workflow,
  MessageSquare,
  Send,
  ShoppingCart,
  User,
  TrendingUp,
  BookOpen,
  Package,
  Calendar,
  MessageCircle,
  AppWindow,
  LayoutTemplate,
  Video,
  X,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

type NavItem = {
  label: string;
  icon: typeof Home;
  path: string;
  children?: NavItem[];
};

type AppSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const gestaoItems: NavItem[] = [
  { label: "Clientes", icon: Users, path: "/clients", children: [{ label: "Contratos", icon: FileText, path: "/contracts" }] },
  { label: "Vendas", icon: ShoppingCart, path: "/sales", children: [{ label: "CRM", icon: Contact, path: "/aikortex/crm" }, { label: "Reuniões", icon: Video, path: "/meetings" }] },
  { label: "Financeiro", icon: DollarSign, path: "/financeiro", children: [{ label: "Gestão Fin.", icon: DollarSign, path: "/financial" }] },
  { label: "Equipe", icon: UserCheck, path: "/team" },
  { label: "Tarefas", icon: CheckSquare, path: "/tasks" },
];

const partnersItems: NavItem[] = [
  { label: "Perfil", icon: User, path: "/partners?tab=profile" },
  { label: "Evolução", icon: TrendingUp, path: "/partners?tab=tiers" },
  { label: "Treinamentos", icon: BookOpen, path: "/partners?tab=training" },
  { label: "Templates", icon: LayoutTemplate, path: "/partners?tab=marketplace" },
  { label: "Eventos", icon: Calendar, path: "/partners?tab=events" },
  { label: "Comunidade", icon: MessageCircle, path: "/partners?tab=community" },
];

const aikortexItems: NavItem[] = [
  { label: "Agentes", icon: Bot, path: "/aikortex/agents" },
  { label: "Ligações", icon: PhoneIcon, path: "/calls" },
  { label: "Flows", icon: Workflow, path: "/aikortex/automations" },
  { label: "Apps", icon: AppWindow, path: "/apps" },
  { label: "Mensagens", icon: MessageSquare, path: "/aikortex/messages" },
  { label: "Disparos", icon: Send, path: "/aikortex/broadcasts" },
];

const MODULE_KEY_MAP: Record<string, string> = {
  "/aikortex/agents": "aikortex.agentes",
  "/calls": "aikortex.agentes",
  "/aikortex/automations": "aikortex.flows",
  "/apps": "aikortex.apps",
  "/app-builder": "aikortex.apps",
  "/templates": "aikortex.templates",
  "/aikortex/messages": "aikortex.mensagens",
  "/aikortex/broadcasts": "aikortex.disparos",
  "/clients": "gestao.clientes",
  "/contracts": "gestao.contratos",
  "/sales": "gestao.vendas",
  "/aikortex/crm": "gestao.crm",
  "/meetings": "gestao.reunioes",
  "/financial": "gestao.financeiro",
  "/team": "gestao.equipe",
  "/tasks": "gestao.tarefas",
};

const SIDEBAR_STATE_KEY = "sidebar-state";

const loadSidebarState = () => {
  try {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

const saveSidebarState = (state: Record<string, unknown>) => {
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state));
  } catch {}
};

const AppSidebar = ({ mobileOpen = false, onMobileClose }: AppSidebarProps) => {
  const saved = loadSidebarState();
  const [collapsed, setCollapsed] = useState(saved?.collapsed ?? false);
  const [gestaoOpen, setGestaoOpen] = useState(saved?.gestaoOpen ?? true);
  const [partnersOpen, setPartnersOpen] = useState(saved?.partnersOpen ?? true);
  const [aikortexOpen, setAikortexOpen] = useState(saved?.aikortexOpen ?? true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    saved?.expandedItems ?? { "/clients": true, "/sales": true }
  );

  useEffect(() => {
    saveSidebarState({ collapsed, gestaoOpen, partnersOpen, aikortexOpen, expandedItems });
  }, [collapsed, gestaoOpen, partnersOpen, aikortexOpen, expandedItems]);

  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { signOut, isPlatform } = useAuth();
  const { agencyName, clients, activeWorkspace, switchToAgency, switchToClient } = useWorkspace();
  const { canAccess } = useModuleAccess();
  const { messageCount, monthlyLimit, hasByok, isNearLimit, isUnlimited } = useMonthlyUsage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) onMobileClose?.();
  }, [location.pathname, location.search, isMobile, onMobileClose]);

  const isItemActive = (path: string) => {
    if (path.includes("?tab=")) {
      const [base, query] = path.split("?");
      return location.pathname === base && location.search === `?${query}`;
    }
    return location.pathname === path;
  };

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleNavigate = useCallback(() => {
    if (isMobile) onMobileClose?.();
  }, [isMobile, onMobileClose]);

  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors overflow-hidden ${
      active
        ? "bg-sidebar-accent text-primary font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
    }`;

  const renderItem = (item: NavItem, depth = 0) => {
    const isActive = isItemActive(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.path];
    const basePath = item.path.split("?")[0];
    const moduleKey = MODULE_KEY_MAP[basePath];
    const isLocked = moduleKey ? !canAccess(moduleKey) : false;

    return (
      <div key={item.path}>
        <div className="flex items-center">
          {isLocked ? (
            <button
              onClick={() => { handleNavigate(); navigate("/partners?tab=tiers"); }}
              className={`${linkClasses(false)} flex-1 opacity-50 cursor-not-allowed`}
              style={!collapsed && depth > 0 ? { paddingLeft: "2.75rem" } : undefined}
              title={collapsed && !isMobile ? `${item.label} (bloqueado)` : "Disponível em um tier superior"}
            >
              <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
              {(!collapsed || isMobile) && <span className="flex-1 truncate text-muted-foreground">{item.label}</span>}
            </button>
          ) : (
            <Link
              to={item.path}
              onClick={handleNavigate}
              className={`${linkClasses(isActive)} flex-1`}
              style={!collapsed && depth > 0 ? { paddingLeft: "2.75rem" } : undefined}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
              {(!collapsed || isMobile) && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
          )}
          {hasChildren && !collapsed && !isMobile && !isLocked && (
            <button
              onClick={() => toggleExpand(item.path)}
              className="p-1 mr-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
            </button>
          )}
        </div>
        {hasChildren && !isLocked && (isExpanded || collapsed || isMobile) && (!collapsed || isMobile) && (
          <div className="space-y-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (label: string, items: NavItem[], open: boolean, setOpen: (v: boolean) => void) => (
    <div>
      {!collapsed || isMobile ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full px-3 py-2 mt-4 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>{label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      ) : (
        <div className="border-t border-sidebar-border my-2" />
      )}
      {(open || collapsed || isMobile) && (
        <div className="space-y-0.5">
          {items.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );

  const usagePercent = isUnlimited || monthlyLimit <= 0 ? 0 : Math.min(100, (messageCount / monthlyLimit) * 100);

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`
            : collapsed
              ? "w-16"
              : "w-56"
        }`}
      >
        <div className={`flex h-14 items-center border-b border-sidebar-border px-4 ${isMobile ? "justify-between" : "justify-center"}`}>
          <img
            src={collapsed && !isMobile
              ? (theme === "dark" ? aikortexIconWhite : aikortexIconBlack)
              : (theme === "dark" ? aikortexLogoWhite : aikortexLogoBlack)
            }
            alt="Aikortex"
            className={collapsed && !isMobile ? "h-7 w-7 object-contain" : "h-7 w-auto object-contain"}
          />
          {isMobile && (
            <button type="button" onClick={onMobileClose} className="rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground">
              <X className="h-4 w-4" /><span className="sr-only">Fechar menu</span>
            </button>
          )}
        </div>

        {(!collapsed || isMobile) && (
          <div className="px-2 pt-3">
            <Select
              value={activeWorkspace.type === "agency" ? "__agency__" : activeWorkspace.id}
              onValueChange={(val) => {
                if (val === "__agency__") {
                  switchToAgency();
                } else {
                  const client = clients.find(c => c.id === val);
                  if (client) switchToClient(client);
                }
              }}
            >
              <SelectTrigger className="w-full h-8 text-xs border-sidebar-border"><SelectValue placeholder="Workspace" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__agency__">{agencyName}</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin">
          <div className="mt-2 space-y-0.5">
            <Link to="/home" onClick={handleNavigate} className={linkClasses(isItemActive("/home"))} title={collapsed && !isMobile ? "Home" : undefined}>
              <Home className={`w-4 h-4 shrink-0 ${isItemActive("/home") ? "text-primary" : ""}`} />
              {(!collapsed || isMobile) && <span>Home</span>}
            </Link>
            <Link to="/dashboard" onClick={handleNavigate} className={linkClasses(isItemActive("/dashboard"))} title={collapsed && !isMobile ? "Dashboard" : undefined}>
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${isItemActive("/dashboard") ? "text-primary" : ""}`} />
              {(!collapsed || isMobile) && <span>Dashboard</span>}
            </Link>
          </div>

          {renderGroup("Aikortex", aikortexItems, aikortexOpen, setAikortexOpen)}
          {renderGroup("Gestão", gestaoItems, gestaoOpen, setGestaoOpen)}
          {renderGroup("Partners", partnersItems, partnersOpen, setPartnersOpen)}

          {/* Seção Conta & Suporte */}
          <div>
            {!collapsed || isMobile ? (
              <div className="px-3 py-2 mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                Conta
              </div>
            ) : (
              <div className="border-t border-sidebar-border my-2" />
            )}
            <div className="space-y-0.5">
              {/* Usage indicator — hidden for platform users */}
              {!isPlatform && hasByok && (
                <button
                  onClick={() => { handleNavigate(); navigate("/ai-setup"); }}
                  className={`${linkClasses(false)} w-full`}
                  title={collapsed && !isMobile ? "Chave própria ativa" : undefined}
                >
                  <Key className="w-4 h-4 shrink-0 text-green-500" />
                  {(!collapsed || isMobile) && (
                    <span className="text-xs text-green-600 font-medium truncate">Chave própria ativa</span>
                  )}
                </button>
              )}
              {!isPlatform && !hasByok && (
                <button
                  onClick={() => { handleNavigate(); navigate("/ai-setup"); }}
                  className={`${linkClasses(false)} w-full group relative`}
                  title={collapsed && !isMobile ? `${messageCount}/${monthlyLimit} msgs` : undefined}
                >
                  <div className="relative">
                    <Activity className="w-4 h-4 shrink-0 text-primary" />
                    {isNearLimit && collapsed && !isMobile && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  {(!collapsed || isMobile) && (
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{messageCount} / {isUnlimited ? "∞" : monthlyLimit}</span>
                        <span className="text-muted-foreground">msgs</span>
                      </div>
                      {!isUnlimited && (
                        <Progress value={usagePercent} className="h-1" />
                      )}
                    </div>
                  )}
                </button>
              )}

              <Link to="/settings" onClick={handleNavigate} className={linkClasses(isItemActive("/settings"))} title={collapsed && !isMobile ? "Configurações" : undefined}>
                <Settings className={`w-4 h-4 shrink-0 ${isItemActive("/settings") ? "text-primary" : ""}`} />
                {(!collapsed || isMobile) && <span className="truncate">Configurações</span>}
              </Link>
              {isPlatform && (
                <Link to="/admin" onClick={handleNavigate} className={linkClasses(isItemActive("/admin"))} title={collapsed && !isMobile ? "Painel Admin" : undefined}>
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${isItemActive("/admin") ? "text-primary" : ""}`} />
                  {(!collapsed || isMobile) && <span className="truncate">Painel Admin</span>}
                </Link>
              )}
            </div>
          </div>
        </nav>

        <div className="space-y-0.5 border-t border-sidebar-border px-2 py-2">
          <button onClick={toggle} className={`${linkClasses(false)} w-full`} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {(!collapsed || isMobile) && <span className="truncate">{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>}
          </button>

          <button onClick={async () => { await signOut(); navigate("/"); }} className={`${linkClasses(false)} w-full`} title={collapsed && !isMobile ? "Sair" : undefined}>
            <LogOut className="w-4 h-4 shrink-0 text-destructive" />
            {(!collapsed || isMobile) && <span className="truncate text-destructive">Sair</span>}
          </button>

          {isMobile ? (
            <button type="button" onClick={onMobileClose} className={`${linkClasses(false)} w-full`}>
              <X className="w-4 h-4 shrink-0" /><span>Fechar menu</span>
            </button>
          ) : (
            <button onClick={() => setCollapsed(!collapsed)} className={`${linkClasses(false)} w-full`}>
              {collapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <><ChevronLeft className="w-4 h-4 shrink-0" /><span>Recolher</span></>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
