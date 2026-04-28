import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, Loader2, RefreshCw, Building2, CheckCircle, XCircle, ChevronDown, ChevronRight, Eye } from "lucide-react";

interface AgencyRow {
  id: string;
  user_id: string;
  agency_name: string | null;
  logo_url: string | null;
  tier: string;
  active_clients_count: number | null;
  asaas_api_key: string | null;
  asaas_wallet_id: string | null;
  created_at: string | null;
  custom_pricing: any;
  email?: string;
  mrr?: number;
  platformRevenue?: number;
}

interface ClientDetail {
  id: string;
  client_name: string;
  client_email: string | null;
  status: string | null;
  templates: string[];
  mrr: number;
}

interface AdminAgenciesProps {
  initialTierFilter?: string;
  initialAgencyId?: string;
  onOpenClient?: (clientId: string) => void;
}

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  starter: { label: "Starter", className: "bg-muted text-muted-foreground" },
  explorer: { label: "Explorer", className: "bg-blue-500/10 text-blue-600" },
  hack: { label: "Hack", className: "bg-purple-500/10 text-purple-600" },
};

const getTierProgress = (tier: string, clients: number) => {
  if (tier === "hack") return { target: 15, pct: 100, next: null };
  if (tier === "explorer") return { target: 15, pct: Math.min(100, (clients / 15) * 100), next: "Hack" };
  return { target: 5, pct: Math.min(100, (clients / 5) * 100), next: "Explorer" };
};

const relativeDate = (d: string | null) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  if (days < 365) return `${Math.floor(days / 30)}m atrás`;
  return new Date(d).toLocaleDateString("pt-BR");
};

const AdminAgenciesTab = ({ initialTierFilter, initialAgencyId, onOpenClient }: AdminAgenciesProps) => {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(initialTierFilter || "all");
  const [asaasFilter, setAsaasFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [expandedId, setExpandedId] = useState<string | null>(initialAgencyId || null);
  const [expandedClients, setExpandedClients] = useState<ClientDetail[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  useEffect(() => { fetchAgencies(); }, []);
  useEffect(() => { if (initialTierFilter) setTierFilter(initialTierFilter); }, [initialTierFilter]);
  useEffect(() => { if (initialAgencyId) toggleExpand(initialAgencyId); }, [initialAgencyId]);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const [agenciesRes, subsRes, usersData] = await Promise.all([
        supabase.from("agency_profiles").select("id, user_id, agency_name, logo_url, tier, active_clients_count, asaas_api_key, asaas_wallet_id, created_at, custom_pricing").then((res: any) => {
          // Convert sensitive payment key into boolean indicator before exposing to UI
          if (res.data) {
            res.data = res.data.map((row: any) => ({
              ...row,
              asaas_api_key: row.asaas_api_key ? "connected" : null,
            }));
          }
          return res;
        }),
        supabase.from("client_template_subscriptions").select("agency_id, agency_price_monthly, platform_price_monthly, status").in("status", ["active", "trial"]),
        supabase.functions.invoke("admin-get-users"),
      ]);

      const usersMap = new Map<string, string>();
      (usersData?.data?.users || []).forEach((u: any) => usersMap.set(u.user_id, u.email || ""));

      const mrrMap = new Map<string, number>();
      const platformMap = new Map<string, number>();
      (subsRes.data || []).forEach((s: any) => {
        mrrMap.set(s.agency_id, (mrrMap.get(s.agency_id) || 0) + ((s.agency_price_monthly || 0) - (s.platform_price_monthly || 0)));
        platformMap.set(s.agency_id, (platformMap.get(s.agency_id) || 0) + (s.platform_price_monthly || 0));
      });

      setAgencies((agenciesRes.data || []).map(a => ({
        ...a,
        email: usersMap.get(a.user_id) || "",
        mrr: mrrMap.get(a.id) || 0,
        platformRevenue: platformMap.get(a.id) || 0,
      })));
    } catch {
      toast.error("Erro ao carregar agências");
    }
    setLoading(false);
  };

  const toggleExpand = async (agencyId: string) => {
    if (expandedId === agencyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(agencyId);
    setExpandedLoading(true);

    const [clientsRes, subsRes, templatesRes] = await Promise.all([
      supabase.from("agency_clients").select("id, client_name, client_email, status").eq("agency_id", agencyId),
      supabase.from("client_template_subscriptions").select("client_id, template_id, agency_price_monthly, status").eq("agency_id", agencyId).in("status", ["active", "trial"]),
      supabase.from("platform_templates").select("id, name"),
    ]);

    const templateMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));
    const clientTemplates = new Map<string, Set<string>>();
    const clientMRR = new Map<string, number>();
    (subsRes.data || []).forEach(s => {
      if (!clientTemplates.has(s.client_id)) clientTemplates.set(s.client_id, new Set());
      const name = templateMap.get(s.template_id);
      if (name) clientTemplates.get(s.client_id)!.add(name);
      clientMRR.set(s.client_id, (clientMRR.get(s.client_id) || 0) + (s.agency_price_monthly || 0));
    });

    setExpandedClients((clientsRes.data || []).map(c => ({
      ...c,
      templates: [...(clientTemplates.get(c.id) || [])],
      mrr: clientMRR.get(c.id) || 0,
    })));
    setExpandedLoading(false);
  };

  const filtered = agencies.filter(a => {
    if (search) {
      const s = search.toLowerCase();
      if (!(a.agency_name || "").toLowerCase().includes(s) && !(a.email || "").toLowerCase().includes(s)) return false;
    }
    if (tierFilter !== "all" && a.tier !== tierFilter) return false;
    if (asaasFilter === "connected" && !a.asaas_api_key) return false;
    if (asaasFilter === "not_connected" && a.asaas_api_key) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "mrr") return (b.mrr || 0) - (a.mrr || 0);
    if (sortBy === "clients") return (b.active_clients_count || 0) - (a.active_clients_count || 0);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar agência por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tiers</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="explorer">Explorer</SelectItem>
              <SelectItem value="hack">Hack</SelectItem>
            </SelectContent>
          </Select>
          <Select value={asaasFilter} onValueChange={setAsaasFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Asaas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Asaas: Todos</SelectItem>
              <SelectItem value="connected">Conectado</SelectItem>
              <SelectItem value="not_connected">Não configurado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data de cadastro</SelectItem>
              <SelectItem value="mrr">MRR</SelectItem>
              <SelectItem value="clients">Clientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAgencies} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} agência(s)</div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Agência</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>MRR Agência</TableHead>
                <TableHead>Asaas</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma agência encontrada</TableCell></TableRow>
              ) : filtered.map(a => {
                const tier = TIER_BADGES[a.tier] || TIER_BADGES.starter;
                const progress = getTierProgress(a.tier, a.active_clients_count || 0);
                const isExpanded = expandedId === a.id;

                return (
                  <React.Fragment key={a.id}>
                    <TableRow className="cursor-pointer hover:bg-accent/50" onClick={() => toggleExpand(a.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {a.logo_url ? (
                            <img src={a.logo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{a.agency_name || "Sem nome"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.email || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={`${tier.className} border-0 text-xs`}>{tier.label}</Badge>
                          {progress.next && (
                            <div className="text-[10px] text-muted-foreground">
                              {a.active_clients_count || 0}/{progress.target} → {progress.next}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{a.active_clients_count || 0}</TableCell>
                      <TableCell className="font-medium">R$ {(a.mrr || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {a.asaas_api_key ? (
                          <Badge className="bg-green-500/10 text-green-600 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border-0 text-xs"><XCircle className="w-3 h-3 mr-1" />Não config.</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{relativeDate(a.created_at)}</TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-accent/30 p-0">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Informações</p>
                                <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {a.email || "—"}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Asaas:</span> {a.asaas_api_key ? "Configurado" : "Não configurado"}</p>
                                {a.asaas_wallet_id && <p className="text-xs text-muted-foreground">Wallet: {a.asaas_wallet_id.slice(0, 8)}••••</p>}
                                {a.custom_pricing && Object.keys(a.custom_pricing).length > 0 && (
                                  <p className="text-sm"><span className="text-muted-foreground">Preços customizados:</span> Sim</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Tier</p>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${tier.className} border-0`}>{tier.label}</Badge>
                                  <span className="text-sm">{a.active_clients_count || 0} clientes</span>
                                </div>
                                <Progress value={progress.pct} className="h-2" />
                                {progress.next && (
                                  <p className="text-xs text-muted-foreground">
                                    Faltam {progress.target - (a.active_clients_count || 0)} clientes para {progress.next}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Financeiro</p>
                                <p className="text-sm">MRR Total: <span className="font-bold">R$ {((a.mrr || 0) + (a.platformRevenue || 0)).toFixed(2)}</span></p>
                                <p className="text-sm">Plataforma: <span className="font-medium text-primary">R$ {(a.platformRevenue || 0).toFixed(2)}</span></p>
                                <p className="text-sm">Lucro Agência: <span className="font-medium">R$ {(a.mrr || 0).toFixed(2)}</span></p>
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Clientes ({expandedClients.length})</p>
                              {expandedLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : expandedClients.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Cliente</TableHead>
                                      <TableHead>Templates</TableHead>
                                      <TableHead>MRR</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead className="w-10" />
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expandedClients.map(c => (
                                      <TableRow key={c.id}>
                                        <TableCell>
                                          <div>
                                            <span className="font-medium text-sm">{c.client_name}</span>
                                            {c.client_email && <p className="text-xs text-muted-foreground">{c.client_email}</p>}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {c.templates.slice(0, 2).map(t => (
                                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                            ))}
                                            {c.templates.length > 2 && <Badge variant="outline" className="text-[10px]">+{c.templates.length - 2}</Badge>}
                                            {c.templates.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">R$ {c.mrr.toFixed(2)}</TableCell>
                                        <TableCell>
                                          <Badge className={`border-0 text-xs ${c.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                                            {c.status === "active" ? "Ativo" : c.status || "—"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {onOpenClient && (
                                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onOpenClient(c.id); }}>
                                              <Eye className="w-3 h-3 mr-1" /> Ver
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgenciesTab;
