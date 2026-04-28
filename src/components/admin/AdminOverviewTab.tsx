import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, DollarSign, LayoutTemplate, TrendingUp, ArrowDownRight, BarChart3, Activity, ChevronRight } from "lucide-react";

interface OverviewProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

const AdminOverviewTab = ({ onNavigate }: OverviewProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAgencies: 0,
    totalClients: 0,
    platformMRR: 0,
    templatesSold: 0,
    newThisMonth: 0,
    churnRate: 0,
    avgTicket: 0,
    tierBreakdown: { starter: { agencies: 0, clients: 0, mrr: 0 }, explorer: { agencies: 0, clients: 0, mrr: 0 }, hack: { agencies: 0, clients: 0, mrr: 0 } },
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [agenciesRes, clientsRes, subsRes, eventsRes, allSubsRes] = await Promise.all([
        supabase.from("agency_profiles").select("id, tier, active_clients_count, created_at, user_id"),
        supabase.from("agency_clients").select("id, status, created_at, agency_id"),
        supabase.from("client_template_subscriptions").select("id, agency_id, platform_price_monthly, agency_price_monthly, status").in("status", ["active", "trial"]),
        supabase.from("billing_events").select("id, event_type, amount, platform_amount, agency_amount, agency_id, client_id, description, created_at").order("created_at", { ascending: false }).limit(15),
        supabase.from("client_template_subscriptions").select("id, status"),
      ]);

      const agencies = agenciesRes.data || [];
      const clients = clientsRes.data || [];
      const activeSubs = subsRes.data || [];
      const allSubs = allSubsRes.data || [];
      const activeClients = clients.filter(c => c.status === "active");
      const platformMRR = activeSubs.reduce((sum, s) => sum + (s.platform_price_monthly || 0), 0);
      const newAgencies = agencies.filter(a => a.created_at && a.created_at >= monthStart).length;
      const newClients = clients.filter(c => c.created_at && c.created_at >= monthStart).length;
      const cancelled = allSubs.filter(s => s.status === "cancelled").length;
      const churnRate = allSubs.length > 0 ? (cancelled / allSubs.length) * 100 : 0;

      // Agency MRR map
      const agencyMRR = new Map<string, number>();
      activeSubs.forEach(s => {
        agencyMRR.set(s.agency_id, (agencyMRR.get(s.agency_id) || 0) + (s.platform_price_monthly || 0));
      });
      const avgTicket = agencyMRR.size > 0 ? platformMRR / agencyMRR.size : 0;

      // Tier breakdown with clients and MRR
      const agencyTierMap = new Map(agencies.map(a => [a.id, a.tier]));
      const tierBreakdown = {
        starter: { agencies: 0, clients: 0, mrr: 0 },
        explorer: { agencies: 0, clients: 0, mrr: 0 },
        hack: { agencies: 0, clients: 0, mrr: 0 },
      };
      agencies.forEach(a => {
        const t = a.tier as keyof typeof tierBreakdown;
        if (tierBreakdown[t]) {
          tierBreakdown[t].agencies++;
          tierBreakdown[t].clients += a.active_clients_count || 0;
        }
      });
      activeSubs.forEach(s => {
        const tier = agencyTierMap.get(s.agency_id) as keyof typeof tierBreakdown;
        if (tier && tierBreakdown[tier]) {
          tierBreakdown[tier].mrr += s.platform_price_monthly || 0;
        }
      });

      // Enrich events
      const agencyIds = [...new Set((eventsRes.data || []).map(e => e.agency_id).filter(Boolean))];
      const clientIds = [...new Set((eventsRes.data || []).map(e => e.client_id).filter(Boolean))];
      const [agencyNames, clientNames] = await Promise.all([
        agencyIds.length > 0 ? supabase.from("agency_profiles").select("id, agency_name").in("id", agencyIds) : { data: [] },
        clientIds.length > 0 ? supabase.from("agency_clients").select("id, client_name").in("id", clientIds) : { data: [] },
      ]);
      const agencyMap = new Map((agencyNames.data || []).map(a => [a.id, a.agency_name || "Sem nome"]));
      const clientMap = new Map((clientNames.data || []).map(c => [c.id, c.client_name]));

      setRecentEvents((eventsRes.data || []).map(e => ({
        ...e,
        agency_name: agencyMap.get(e.agency_id) || "—",
        client_name: clientMap.get(e.client_id) || "—",
      })));

      setStats({ totalAgencies: agencies.length, totalClients: activeClients.length, platformMRR, templatesSold: activeSubs.length, newThisMonth: newAgencies + newClients, churnRate, avgTicket, tierBreakdown });
    } catch {
      console.error("Error loading overview");
    }
    setLoading(false);
  };

  const nav = (tab: string, params?: Record<string, string>) => onNavigate?.(tab, params);

  const eventDescription = (e: any) => {
    const typeMap: Record<string, string> = {
      payment_received: "pagamento recebido",
      payment_failed: "pagamento falhou",
      subscription_created: "assinou template",
      subscription_cancelled: "cancelou assinatura",
      refund: "reembolso processado",
    };
    return typeMap[e.event_type] || e.event_type;
  };

  const eventBadge = (type: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      payment_received: { label: "Pago", cls: "bg-green-500/10 text-green-600" },
      payment_failed: { label: "Falhou", cls: "bg-red-500/10 text-red-600" },
      subscription_created: { label: "Nova", cls: "bg-blue-500/10 text-blue-600" },
      subscription_cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
      refund: { label: "Reembolso", cls: "bg-yellow-500/10 text-yellow-600" },
    };
    const cfg = map[type] || { label: type, cls: "bg-muted text-muted-foreground" };
    return <Badge className={`${cfg.cls} border-0 text-xs`}>{cfg.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const tierRows = [
    { key: "starter" as const, label: "Starter", cls: "bg-muted", textCls: "text-muted-foreground" },
    { key: "explorer" as const, label: "Explorer", cls: "bg-blue-500/10", textCls: "text-blue-600" },
    { key: "hack" as const, label: "Hack", cls: "bg-purple-500/10", textCls: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Clickable stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, iconCls: "bg-blue-500/10 text-blue-600", value: stats.totalAgencies, label: "Agências ativas", tab: "gestao" },
          { icon: Users, iconCls: "bg-emerald-500/10 text-emerald-600", value: stats.totalClients, label: "Clientes ativos", tab: "gestao" },
          { icon: DollarSign, iconCls: "bg-primary/10 text-primary", value: `R$ ${stats.platformMRR.toFixed(0)}`, label: "MRR da plataforma", tab: "financeiro" },
          { icon: LayoutTemplate, iconCls: "bg-purple-500/10 text-purple-600", value: stats.templatesSold, label: "Templates vendidos", tab: "templates" },
        ].map(s => (
          <Card
            key={s.tab}
            className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            onClick={() => nav(s.tab)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.iconCls.split(" ")[0]}`}>
                <s.icon className={`h-5 w-5 ${s.iconCls.split(" ")[1]}`} />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <TrendingUp className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.newThisMonth}</p>
              <p className="text-xs text-muted-foreground">Novos este mês</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <ArrowDownRight className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.churnRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Taxa de churn</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">R$ {stats.avgTicket.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Ticket médio/agência</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier breakdown widget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Distribuição por tier</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {tierRows.map(t => {
              const data = stats.tierBreakdown[t.key];
              return (
                <div
                  key={t.key}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => nav("gestao", { tier: t.key })}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={`${t.cls} ${t.textCls} border-0 text-xs min-w-[70px] justify-center`}>{t.label}</Badge>
                    <span className="text-sm font-medium">{data.agencies} agência(s)</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{data.clients} clientes</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-primary">R$ {data.mrr.toFixed(0)} MRR</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" /> Atividade recente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado</p>
          ) : (
            <div className="divide-y divide-border">
              {recentEvents.map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    if (e.client_id) nav("gestao", { clientId: e.client_id });
                    else if (e.agency_id) nav("gestao", { agencyId: e.agency_id });
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-blue-600 hover:underline">{e.agency_name}</span>
                    {e.client_name !== "—" && (
                      <>
                        <span className="text-muted-foreground"> — </span>
                        <span className="font-medium">{e.client_name}</span>
                      </>
                    )}
                    <span className="text-muted-foreground"> — {eventDescription(e)}</span>
                    {e.description && <span className="text-muted-foreground"> — {e.description}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {e.platform_amount != null && <span className="font-medium">R$ {Number(e.platform_amount).toFixed(2)}</span>}
                    {eventBadge(e.event_type)}
                    <span className="text-xs text-muted-foreground">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverviewTab;
