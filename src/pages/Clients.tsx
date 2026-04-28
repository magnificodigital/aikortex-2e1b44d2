import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Users, Plus, Search, MoreHorizontal, Eye, Settings, Ban, Trash2,
  Trophy, DollarSign, LayoutTemplate, TrendingUp,
} from "lucide-react";
import AddClientWizard from "@/components/clients/AddClientWizard";

type AgencyClient = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: string | null;
  created_at: string | null;
  asaas_customer_id: string | null;
};

type TemplateSub = {
  client_id: string;
  agency_price_monthly: number;
  status: string | null;
  template_name?: string;
};

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Ativo", class: "bg-green-500/10 text-green-600 border-green-500/20" },
  pending: { label: "Pendente", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  suspended: { label: "Suspenso", class: "bg-destructive/10 text-destructive border-destructive/20" },
  inactive: { label: "Inativo", class: "bg-muted text-muted-foreground border-border" },
};

const TIER_LABELS: Record<string, string> = { starter: "Starter", explorer: "Explorer", hack: "Hack" };

const Clients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [subs, setSubs] = useState<TemplateSub[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showWizard, setShowWizard] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const [agRes, clRes] = await Promise.all([
      supabase.from("agency_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("agency_clients").select("*").order("created_at", { ascending: false }),
    ]);
    if (agRes.data) setAgency(agRes.data);
    if (clRes.data) setClients(clRes.data as AgencyClient[]);

    if (agRes.data) {
      const { data: subData } = await supabase
        .from("client_template_subscriptions")
        .select("client_id, agency_price_monthly, status")
        .eq("agency_id", agRes.data.id);
      if (subData) setSubs(subData as TemplateSub[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const filtered = clients.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.client_name.toLowerCase().includes(q) && !(c.client_email ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeClients = clients.filter((c) => c.status === "active").length;
  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trial");
  const monthlyRevenue = activeSubs.reduce((sum, s) => sum + Number(s.agency_price_monthly), 0);

  const agencyTier = agency?.tier ?? "starter";
  const clientCount = agency?.active_clients_count ?? 0;
  const tierProgress = useMemo(() => {
    if (agencyTier === "hack") return { label: "Nível máximo 🏆", pct: 100 };
    if (agencyTier === "explorer") return { label: `${clientCount}/15 → Hack`, pct: Math.min(100, (clientCount / 15) * 100) };
    return { label: `${clientCount}/5 → Explorer`, pct: Math.min(100, (clientCount / 5) * 100) };
  }, [agencyTier, clientCount]);

  const getSubsForClient = (cId: string) => subs.filter((s) => s.client_id === cId && (s.status === "active" || s.status === "trial"));

  const handleSuspend = async (id: string) => {
    await supabase.from("agency_clients").update({ status: "suspended" }).eq("id", id);
    toast.success("Cliente suspenso");
    loadData();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("agency_clients").update({ status: "inactive" }).eq("id", id);
    toast.success("Cliente removido");
    loadData();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meus Clientes</h1>
              <p className="text-sm text-muted-foreground">Gerencie os clientes da sua agência</p>
            </div>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Clientes ativos</p><p className="text-xl font-bold text-foreground">{activeClients}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            <div><p className="text-xs text-muted-foreground">Receita mensal</p><p className="text-xl font-bold text-foreground">R$ {monthlyRevenue.toFixed(0)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <LayoutTemplate className="w-5 h-5 text-blue-600" />
            <div><p className="text-xs text-muted-foreground">Templates ativos</p><p className="text-xl font-bold text-foreground">{activeSubs.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Tier {TIER_LABELS[agencyTier]}</p>
              <Progress value={tierProgress.pct} className="h-1.5 mt-1" />
              <p className="text-[10px] text-muted-foreground mt-0.5">{tierProgress.label}</p>
            </div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Templates</TableHead>
                <TableHead className="hidden md:table-cell">Receita/mês</TableHead>
                <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const st = STATUS_MAP[c.status ?? "pending"] ?? STATUS_MAP.pending;
                const clientSubs = getSubsForClient(c.id);
                const rev = clientSubs.reduce((s, sub) => s + Number(sub.agency_price_monthly), 0);
                const initials = c.client_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{initials}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.client_name}</p>
                          <p className="text-xs text-muted-foreground">{c.client_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`${st.class} border`}>{st.label}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{clientSubs.length}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-medium text-foreground">R$ {rev.toFixed(0)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.id}`); }}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSuspend(c.id); }}>
                            <Ban className="w-4 h-4 mr-2" /> Suspender
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleRemove(c.id); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AddClientWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        agencyId={agency?.id}
        customPricing={agency?.custom_pricing}
        agencyTier={agency?.tier ?? "starter"}
        onSuccess={loadData}
      />
    </DashboardLayout>
  );
};

export default Clients;
