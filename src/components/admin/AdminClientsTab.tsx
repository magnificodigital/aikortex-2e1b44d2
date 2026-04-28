import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, Loader2, RefreshCw, Eye } from "lucide-react";

interface ClientRow {
  id: string;
  client_name: string;
  client_email: string | null;
  status: string | null;
  created_at: string | null;
  agency_id: string;
  agency_name: string;
  agency_tier: string;
  templates: string[];
  templates_count: number;
  mrr: number;
  platformRevenue: number;
  last_payment_date: string | null;
}

interface Agency { id: string; agency_name: string | null; tier: string; }

interface SubDetail {
  template_name: string;
  agency_price: number;
  platform_price: number;
  status: string;
  channel: string | null;
}

interface AdminClientsProps {
  initialAgencyFilter?: string;
  initialClientId?: string;
  onNavigateToAgency?: (agencyId: string) => void;
}

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  starter: { label: "Starter", className: "bg-muted text-muted-foreground" },
  explorer: { label: "Explorer", className: "bg-blue-500/10 text-blue-600" },
  hack: { label: "Hack", className: "bg-purple-500/10 text-purple-600" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-500/10 text-green-600" },
  pending: { label: "Pendente", cls: "bg-yellow-500/10 text-yellow-600" },
  suspended: { label: "Suspenso", cls: "bg-red-500/10 text-red-500" },
  inactive: { label: "Inativo", cls: "bg-muted text-muted-foreground" },
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

const AdminClientsTab = ({ initialAgencyFilter, initialClientId, onNavigateToAgency }: AdminClientsProps) => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agencyFilter, setAgencyFilter] = useState(initialAgencyFilter || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [clientSubs, setClientSubs] = useState<SubDetail[]>([]);
  const [clientEvents, setClientEvents] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (initialAgencyFilter) setAgencyFilter(initialAgencyFilter); }, [initialAgencyFilter]);
  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const c = clients.find(cl => cl.id === initialClientId);
      if (c) openDetail(c);
    }
  }, [initialClientId, clients]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const [clientsRes, agenciesRes, subsRes, templatesRes, eventsRes] = await Promise.all([
        supabase.from("agency_clients").select("id, client_name, client_email, status, created_at, agency_id"),
        supabase.from("agency_profiles").select("id, agency_name, tier"),
        supabase.from("client_template_subscriptions").select("client_id, template_id, agency_price_monthly, platform_price_monthly, status").in("status", ["active", "trial"]),
        supabase.from("platform_templates").select("id, name"),
        supabase.from("billing_events").select("client_id, created_at").eq("event_type", "payment_received").order("created_at", { ascending: false }),
      ]);

      const agenciesData = agenciesRes.data || [];
      const agenciesMap = new Map<string, Agency>();
      agenciesData.forEach(a => agenciesMap.set(a.id, a));
      setAgencies(agenciesData);

      const templateMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));
      const lastPayment = new Map<string, string>();
      (eventsRes.data || []).forEach(e => {
        if (e.client_id && !lastPayment.has(e.client_id)) lastPayment.set(e.client_id, e.created_at);
      });

      const templateCount = new Map<string, number>();
      const mrrMap = new Map<string, number>();
      const platMap = new Map<string, number>();
      const templateNames = new Map<string, Set<string>>();
      (subsRes.data || []).forEach(s => {
        templateCount.set(s.client_id, (templateCount.get(s.client_id) || 0) + 1);
        mrrMap.set(s.client_id, (mrrMap.get(s.client_id) || 0) + (s.agency_price_monthly || 0));
        platMap.set(s.client_id, (platMap.get(s.client_id) || 0) + (s.platform_price_monthly || 0));
        if (!templateNames.has(s.client_id)) templateNames.set(s.client_id, new Set());
        const name = templateMap.get(s.template_id);
        if (name) templateNames.get(s.client_id)!.add(name);
      });

      setClients((clientsRes.data || []).map(c => {
        const agency = agenciesMap.get(c.agency_id);
        return {
          ...c,
          agency_name: agency?.agency_name || "—",
          agency_tier: agency?.tier || "starter",
          templates: [...(templateNames.get(c.id) || [])],
          templates_count: templateCount.get(c.id) || 0,
          mrr: mrrMap.get(c.id) || 0,
          platformRevenue: platMap.get(c.id) || 0,
          last_payment_date: lastPayment.get(c.id) || null,
        };
      }));
    } catch {
      toast.error("Erro ao carregar clientes");
    }
    setLoading(false);
  };

  const openDetail = async (client: ClientRow) => {
    setSelectedClient(client);
    setDetailLoading(true);

    const [subsRes, templatesRes, eventsRes] = await Promise.all([
      supabase.from("client_template_subscriptions").select("template_id, agency_price_monthly, platform_price_monthly, status, activated_channel").eq("client_id", client.id),
      supabase.from("platform_templates").select("id, name"),
      supabase.from("billing_events").select("id, event_type, amount, platform_amount, description, created_at").eq("client_id", client.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const templateMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));
    setClientSubs((subsRes.data || []).map(s => ({
      template_name: templateMap.get(s.template_id) || "—",
      agency_price: s.agency_price_monthly || 0,
      platform_price: s.platform_price_monthly || 0,
      status: s.status || "—",
      channel: s.activated_channel,
    })));
    setClientEvents(eventsRes.data || []);
    setDetailLoading(false);
  };

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.client_name.toLowerCase().includes(search.toLowerCase()) || (c.client_email || "").toLowerCase().includes(search.toLowerCase());
    const matchAgency = agencyFilter === "all" || c.agency_id === agencyFilter;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchTier = tierFilter === "all" || c.agency_tier === tierFilter;
    return matchSearch && matchAgency && matchStatus && matchTier;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Agência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as agências</SelectItem>
              {agencies.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.agency_name || "Sem nome"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tiers</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="explorer">Explorer</SelectItem>
              <SelectItem value="hack">Hack</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={fetchClients} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} cliente(s)</div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Templates ativos</TableHead>
                <TableHead>MRR cliente</TableHead>
                <TableHead>Receita plataforma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último pagamento</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
              ) : filtered.map(c => {
                const st = STATUS_MAP[c.status || ""] || STATUS_MAP.inactive;
                const agencyTier = TIER_BADGES[c.agency_tier] || TIER_BADGES.starter;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{c.client_name}</div>
                        {c.client_email && <div className="text-xs text-muted-foreground">{c.client_email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm ${onNavigateToAgency ? "text-blue-600 hover:underline cursor-pointer" : ""}`}
                          onClick={() => onNavigateToAgency?.(c.agency_id)}
                        >
                          {c.agency_name}
                        </span>
                        <Badge className={`${agencyTier.className} border-0 text-[10px]`}>{agencyTier.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span>{c.templates_count}</span>
                        <div className="flex flex-wrap gap-1">
                          {c.templates.slice(0, 2).map(t => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                          {c.templates.length > 2 && <Badge variant="outline" className="text-[10px]">+{c.templates.length - 2}</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">R$ {c.mrr.toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-primary">R$ {c.platformRevenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{relativeDate(c.last_payment_date)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{relativeDate(c.created_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => openDetail(c)}>
                        <Eye className="w-4 h-4 mr-1" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail side panel */}
      <Sheet open={!!selectedClient} onOpenChange={o => !o && setSelectedClient(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedClient?.client_name}</SheetTitle>
          </SheetHeader>

          {selectedClient && (
            <div className="space-y-5 mt-4">
              <div className="space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {selectedClient.client_email || "—"}</p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Agência:</span>{" "}
                  <span
                    className={onNavigateToAgency ? "text-blue-600 hover:underline cursor-pointer" : ""}
                    onClick={() => { setSelectedClient(null); onNavigateToAgency?.(selectedClient.agency_id); }}
                  >
                    {selectedClient.agency_name}
                  </span>
                </p>
                <Badge className={`${STATUS_MAP[selectedClient.status || ""]?.cls || ""} border-0 text-xs`}>
                  {STATUS_MAP[selectedClient.status || ""]?.label || selectedClient.status}
                </Badge>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Assinaturas ativas</h3>
                {detailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : clientSubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma assinatura.</p>
                ) : (
                  <div className="space-y-2">
                    {clientSubs.map((s, i) => (
                      <div key={i} className="text-sm border rounded-md px-3 py-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{s.template_name}</span>
                          <Badge variant="secondary" className="text-xs">{s.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Agência: R${s.agency_price.toFixed(2)} · Plataforma: R${s.platform_price.toFixed(2)}
                          {s.channel && ` · ${s.channel}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Histórico de pagamentos</h3>
                {clientEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento.</p>
                ) : (
                  <div className="space-y-2">
                    {clientEvents.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                        <div>
                          <p className="text-xs text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "—"}</p>
                          <p>{e.description || e.event_type}</p>
                        </div>
                        <span className="font-medium">R$ {(e.platform_amount || e.amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminClientsTab;
