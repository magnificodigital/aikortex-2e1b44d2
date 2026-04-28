import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, CreditCard, LayoutTemplate, DollarSign, Key, BookOpen, MessageSquare,
  ArrowLeft, Sun, Moon, BarChart3, Search, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import aikortexIconWhite from "@/assets/aikortex-icon-white.png";
import aikortexIconBlack from "@/assets/aikortex-icon-black.png";

const adminNavItems: { label: string; icon: any; path: string; ownerOnly?: boolean }[] = [
  { label: "Visão Geral", icon: BarChart3, path: "/admin?tab=overview" },
  { label: "Gestão", icon: Building2, path: "/admin?tab=gestao" },
  { label: "Planos", icon: CreditCard, path: "/admin?tab=plans" },
  { label: "Templates", icon: LayoutTemplate, path: "/admin?tab=templates" },
  { label: "Financeiro", icon: DollarSign, path: "/admin?tab=financeiro" },
  { label: "Chaves de API", icon: Key, path: "/admin?tab=api-keys", ownerOnly: true },
  { label: "Suporte", icon: MessageSquare, path: "/admin?tab=support" },
  { label: "Tutoriais", icon: BookOpen, path: "/admin?tab=tutorials" },
];

interface SearchResult {
  type: "agency" | "client" | "user";
  id: string;
  name: string;
  detail: string;
}

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggle } = useTheme();
  const { profile } = useAuth();
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!globalSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const q = globalSearch.toLowerCase();
      const results: SearchResult[] = [];

      const [agenciesRes, clientsRes, usersRes] = await Promise.all([
        supabase.from("agency_profiles").select("id, agency_name, tier").ilike("agency_name", `%${q}%`).limit(5),
        supabase.from("agency_clients").select("id, client_name, client_email").or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%`).limit(5),
        supabase.from("profiles").select("user_id, full_name, role").ilike("full_name", `%${q}%`).limit(5),
      ]);

      (agenciesRes.data || []).forEach(a => results.push({ type: "agency", id: a.id, name: a.agency_name || "Sem nome", detail: a.tier }));
      (clientsRes.data || []).forEach(c => results.push({ type: "client", id: c.id, name: c.client_name, detail: c.client_email || "" }));
      (usersRes.data || []).forEach(u => results.push({ type: "user", id: u.user_id, name: u.full_name || "—", detail: u.role }));

      setSearchResults(results);
      setSearchOpen(results.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const handleSearchSelect = (r: SearchResult) => {
    setGlobalSearch("");
    setSearchOpen(false);
    if (r.type === "agency") navigate(`/admin?tab=gestao`);
    else if (r.type === "client") navigate(`/admin?tab=gestao`);
    else navigate(`/admin?tab=gestao`);
  };

  const isActive = (path: string) => {
    if (path.includes("?tab=")) {
      const [, query] = path.split("?");
      const currentTab = searchParams.get("tab");
      const navTab = new URLSearchParams(query).get("tab");
      if (!currentTab && navTab === "overview") return true;
      return currentTab === navTab;
    }
    return location.pathname === path && !location.search;
  };

  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
    }`;

  const typeLabels: Record<string, string> = { agency: "Agências", client: "Clientes", user: "Usuários" };
  const groupedResults = searchResults.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <img
            src={theme === "dark" ? aikortexIconWhite : aikortexIconBlack}
            alt="Aikortex"
            className="h-7 w-7 object-contain"
          />
          <span className="font-semibold text-sm text-foreground">Admin</span>
          <Badge variant="secondary" className="ml-auto text-[10px] bg-red-500/10 text-red-500 border-0">
            Plataforma
          </Badge>
        </div>

        {/* Global search */}
        <div className="px-3 py-2 border-b border-sidebar-border" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              className="pl-8 h-8 text-xs"
            />
            {globalSearch && (
              <button onClick={() => { setGlobalSearch(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {searchOpen && (
            <div className="absolute z-50 mt-1 w-48 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <p className="text-[10px] font-semibold text-muted-foreground px-3 py-1 uppercase">{typeLabels[type]}</p>
                  {items.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleSearchSelect(r)}
                      className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs"
                    >
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-muted-foreground truncate text-[10px]">{r.detail}</p>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-muted-foreground">Olá, {profile?.full_name?.split(" ")[0] ?? "Admin"}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Painel de controle Aikortex</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {adminNavItems
            .filter((item) => !item.ownerOnly || profile?.role === "platform_owner")
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={linkClasses(isActive(item.path))}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.path) ? "text-primary" : ""}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
        </nav>

        <div className="space-y-0.5 border-t border-sidebar-border px-2 py-2">
          <button onClick={toggle} className={`${linkClasses(false)} w-full`}>
            {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
          </button>
          <button onClick={() => navigate("/home")} className={`${linkClasses(false)} w-full`}>
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Sair do Admin</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
