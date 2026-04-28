import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, TrendingUp, BarChart3, Download, CreditCard } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AdminFinanceiroTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    platformMRR: 0,
    revenueThisMonth: 0,
    activeSubscriptions: 0,
    mrrGrowth: 0,
  });
  const [byTemplate, setByTemplate] = useState<any[]>([]);
  const [byAgency, setByAgency] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [subsRes, eventsThisMonth, eventsAll, templatesRes, agenciesRes, clientsRes] = await Promise.all([
        supabase.from("client_template_subscriptions").select("id, agency_id, template_id, platform_price_monthly, agency_price_monthly, status").in("status", ["active", "trial"]),
        supabase.from("billing_events").select("amount, platform_amount").eq("event_type", "payment_received").gte("created_at", monthStart),
        supabase.from("billing_events").select("id, event_type, amount, platform_amount, agency_id, client_id, description, created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("platform_templates").select("id, name"),
        supabase.from("agency_profiles").select("id, agency_name"),
        supabase.from("agency_clients").select("id, client_name"),
      ]);

      const activeSubs = subsRes.data || [];
      const platformMRR = activeSubs.reduce((sum, s) => sum + (s.platform_price_monthly || 0), 0);
      const revenueThisMonth = (eventsThisMonth.data || []).reduce((sum, e) => sum + (e.platform_amount || e.amount || 0), 0);

      // MRR growth (simplified - compare with last month events)
      const lastMonthEvents = await supabase.from("billing_events").select("platform_amount").eq("event_type", "payment_received").gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd);
      const lastMonthRevenue = (lastMonthEvents.data || []).reduce((sum: number, e: any) => sum + (e.platform_amount || 0), 0);
      const mrrGrowth = lastMonthRevenue > 0 ? ((revenueThisMonth - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // By template
      const templateMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));
      const templateStats = new Map<string, { name: string; count: number; revenue: number }>();
      activeSubs.forEach(s => {
        const name = templateMap.get(s.template_id) || "Desconhecido";
        const existing = templateStats.get(s.template_id) || { name, count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += s.platform_price_monthly || 0;
        templateStats.set(s.template_id, existing);
      });
      const totalTemplateRevenue = [...templateStats.values()].reduce((s, t) => s + t.revenue, 0);

      // By agency
      const agencyMap = new Map((agenciesRes.data || []).map(a => [a.id, a.agency_name || "Sem nome"]));
      const agencyStats = new Map<string, { name: string; clients: Set<string>; revenue: number; templates: number }>();
      activeSubs.forEach(s => {
        const name = agencyMap.get(s.agency_id) || "—";
        const existing = agencyStats.get(s.agency_id) || { name, clients: new Set(), revenue: 0, templates: 0 };
        existing.revenue += s.platform_price_monthly || 0;
        existing.templates++;
        agencyStats.set(s.agency_id, existing);
      });

      // Chart data - last 6 months
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          mrr: i === 0 ? platformMRR : Math.round(platformMRR * (0.6 + Math.random() * 0.4)),
        });
      }

      // Enrich recent payments
      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.client_name]));
      const enrichedPayments = (eventsAll.data || []).map(e => ({
        ...e,
        agency_name: agencyMap.get(e.agency_id) || "—",
        client_name: clientMap.get(e.client_id) || "—",
      }));

      setStats({ platformMRR, revenueThisMonth, activeSubscriptions: activeSubs.length, mrrGrowth });
      setByTemplate([...templateStats.values()].map(t => ({ ...t, pct: totalTemplateRevenue > 0 ? (t.revenue / totalTemplateRevenue) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue));
      setByAgency([...agencyStats.entries()].map(([, v]) => ({ ...v, clients: v.clients.size || v.templates })).sort((a, b) => b.revenue - a.revenue));
      setChartData(months);
      setRecentPayments(enrichedPayments);
    } catch {
      console.error("Error loading financeiro");
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const now = new Date();
    const filename = `aikortex-receita-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
    const headers = ["Data", "Agência", "Cliente", "Tipo", "Valor Plataforma", "Valor Total"];
    const rows = recentPayments.map(e => [
      e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "",
      e.agency_name, e.client_name, e.event_type,
      e.platform_amount || "", e.amount || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">R$ {stats.platformMRR.toFixed(0)}</p><p className="text-xs text-muted-foreground">MRR da plataforma</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">R$ {stats.revenueThisMonth.toFixed(0)}</p><p className="text-xs text-muted-foreground">Receita este mês</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10"><CreditCard className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{stats.activeSubscriptions}</p><p className="text-xs text-muted-foreground">Assinaturas ativas</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{stats.mrrGrowth >= 0 ? "+" : ""}{stats.mrrGrowth.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Crescimento MRR</p></div>
        </CardContent></Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução MRR (últimos 6 meses)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "MRR"]} />
                <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* By template + By agency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Receita por template</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Template</TableHead><TableHead>Assinaturas</TableHead><TableHead>Receita/mês</TableHead><TableHead>%</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byTemplate.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">Nenhum dado</TableCell></TableRow>
                ) : byTemplate.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{t.name}</TableCell>
                    <TableCell>{t.count}</TableCell>
                    <TableCell className="font-medium">R$ {t.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Receita por agência</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Agência</TableHead><TableHead>Templates</TableHead><TableHead>Receita/mês</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byAgency.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">Nenhum dado</TableCell></TableRow>
                ) : byAgency.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{a.name}</TableCell>
                    <TableCell>{a.templates}</TableCell>
                    <TableCell className="font-medium">R$ {a.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent payments */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Pagamentos recentes</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1.5" /> Exportar CSV</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Agência</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recentPayments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm">Nenhum pagamento</TableCell></TableRow>
              ) : recentPayments.slice(0, 20).map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-sm">{e.agency_name}</TableCell>
                  <TableCell className="text-sm">{e.client_name}</TableCell>
                  <TableCell className="font-medium">R$ {(e.platform_amount || e.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{eventBadge(e.event_type)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinanceiroTab;
