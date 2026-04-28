import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DollarSign, Download, TrendingUp, TrendingDown, Users, Package,
  ChevronDown, Trophy, Star, Shield, Zap, CheckCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const tierInfo: Record<string, { label: string; color: string; next: string | null; threshold: number; icon: typeof Star }> = {
  starter: { label: "Starter", color: "text-muted-foreground", next: "explorer", threshold: 5, icon: Star },
  explorer: { label: "Explorer", color: "text-[hsl(var(--warning))]", next: "hack", threshold: 15, icon: Zap },
  hack: { label: "Hack", color: "text-primary", next: null, threshold: 999, icon: Trophy },
};

const hackBenefits = [
  "Todos os templates disponíveis",
  "White-label com domínio próprio",
  "Suporte prioritário",
  "Treinamento mensal",
];

const Financeiro = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [projClients, setProjClients] = useState(10);
  const [projOpen, setProjOpen] = useState(false);

  // Agency profile
  const { data: agency } = useQuery({
    queryKey: ["agency-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agency_profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Active subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["template-subs", agency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_template_subscriptions")
        .select("*, platform_templates(name, slug, platform_price_monthly)")
        .eq("agency_id", agency!.id);
      return data || [];
    },
    enabled: !!agency,
  });

  // Billing events
  const { data: billingEvents = [] } = useQuery({
    queryKey: ["billing-events", agency?.id, selectedMonth],
    queryFn: async () => {
      const start = `${selectedMonth}-01T00:00:00`;
      const endDate = new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 0);
      const end = `${selectedMonth}-${endDate.getDate()}T23:59:59`;
      const { data } = await supabase
        .from("billing_events")
        .select("*, agency_clients(client_name)")
        .eq("agency_id", agency!.id)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!agency,
  });

  // Clients
  const { data: clients = [] } = useQuery({
    queryKey: ["agency-clients", agency?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agency_clients").select("*").eq("agency_id", agency!.id);
      return data || [];
    },
    enabled: !!agency,
  });

  // Templates for projection
  const { data: templates = [] } = useQuery({
    queryKey: ["platform-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_templates").select("*").eq("is_active", true);
      return data || [];
    },
  });

  // Computed metrics
  const activeSubs = subscriptions.filter((s: any) => s.status === "active" || s.status === "trial");
  const receitaBruta = activeSubs.reduce((s: number, sub: any) => s + Number(sub.agency_price_monthly || 0), 0);
  const custoPlataforma = activeSubs.reduce((s: number, sub: any) => s + Number(sub.platform_price_monthly || 0), 0);
  const lucro = receitaBruta - custoPlataforma;
  const margem = receitaBruta > 0 ? ((lucro / receitaBruta) * 100).toFixed(1) : "0";

  const activeClients = clients.filter((c: any) => c.status === "active").length;
  const currentMonthClients = clients.filter((c: any) => c.created_at?.startsWith(selectedMonth)).length;
  const cancelledSubs = subscriptions.filter((s: any) => s.status === "cancelled").length;

  // Revenue by template
  const revenueByTemplate = useMemo(() => {
    const map: Record<string, { name: string; clients: number; unitPrice: number; revenue: number; cost: number }> = {};
    activeSubs.forEach((sub: any) => {
      const name = sub.platform_templates?.name || "Desconhecido";
      if (!map[name]) map[name] = { name, clients: 0, unitPrice: Number(sub.agency_price_monthly), revenue: 0, cost: 0 };
      map[name].clients++;
      map[name].revenue += Number(sub.agency_price_monthly || 0);
      map[name].cost += Number(sub.platform_price_monthly || 0);
    });
    return Object.values(map);
  }, [activeSubs]);

  // Chart data (last 6 months - simplified)
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(now, 5 - i);
      const month = format(d, "MMM", { locale: ptBR });
      const factor = (i + 1) / 6;
      return {
        month,
        receita: Math.round(receitaBruta * factor),
        lucro: Math.round(lucro * factor),
        custo: Math.round(custoPlataforma * factor),
      };
    });
  }, [receitaBruta, lucro, custoPlataforma]);

  // Tier progress
  const tier = agency?.tier || "starter";
  const info = tierInfo[tier] || tierInfo.starter;
  const nextInfo = info.next ? tierInfo[info.next] : null;
  const progress = nextInfo ? (activeClients / nextInfo.threshold) * 100 : 100;
  const remaining = nextInfo ? nextInfo.threshold - activeClients : 0;

  // Projection
  const projRevenue = useMemo(() => {
    if (!templates.length) return { revenue: 0, cost: 0, profit: 0, tier: "starter" };
    const avgPrice = activeSubs.length > 0
      ? receitaBruta / activeSubs.length
      : templates.reduce((s: number, t: any) => s + Number(t.platform_price_monthly) * 2, 0) / templates.length;
    const avgCost = activeSubs.length > 0
      ? custoPlataforma / activeSubs.length
      : templates.reduce((s: number, t: any) => s + Number(t.platform_price_monthly), 0) / templates.length;
    const revenue = avgPrice * projClients;
    const cost = avgCost * projClients;
    const projTier = projClients >= 15 ? "hack" : projClients >= 5 ? "explorer" : "starter";
    return { revenue, cost, profit: revenue - cost, tier: projTier };
  }, [projClients, templates, activeSubs, receitaBruta, custoPlataforma]);

  // CSV export
  const exportCSV = () => {
    const headers = ["Data,Cliente,Descrição,Valor cobrado,Custo plataforma,Lucro,Status"];
    const rows = billingEvents.map((e: any) => {
      const clientName = (e as any).agency_clients?.client_name || "-";
      const date = e.created_at ? format(new Date(e.created_at), "dd/MM/yyyy") : "-";
      return `${date},"${clientName}","${e.description || ""}",${e.amount || 0},${e.platform_amount || 0},${e.agency_amount || 0},${e.event_type}`;
    });
    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aikortex-financeiro-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(now, i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: ptBR }) };
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-6">
        {/* Tier Progress Widget */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {<info.icon className={`w-6 h-6 ${info.color}`} />}
              <div>
                <span className="text-sm text-muted-foreground">Seu tier atual</span>
                <h3 className={`text-xl font-bold ${info.color}`}>{info.label.toUpperCase()}</h3>
              </div>
            </div>
            {nextInfo && (
              <Badge variant="outline" className="text-xs">
                Faltam {remaining} clientes para {nextInfo.label.toUpperCase()}
              </Badge>
            )}
            {!nextInfo && (
              <Badge className="bg-primary text-primary-foreground">Nível máximo atingido 🏆</Badge>
            )}
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2 mb-2" />
          <span className="text-xs text-muted-foreground">
            {activeClients}/{nextInfo ? nextInfo.threshold : activeClients} clientes ativos
          </span>

          {nextInfo && (
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="text-sm text-primary flex items-center gap-1 hover:underline">
                O que você ganha ao subir de tier <ChevronDown className="w-3 h-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hackBenefits.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
                    {b}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
              <p className="text-sm text-muted-foreground">Acompanhe a receita da sua agência</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats Row 1 — Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Receita bruta", value: fmt(receitaBruta), icon: TrendingUp, color: "text-primary" },
            { label: "Custo plataforma", value: fmt(custoPlataforma), icon: TrendingDown, color: "text-destructive" },
            { label: "Lucro líquido", value: fmt(lucro), icon: DollarSign, color: "text-[hsl(var(--success))]" },
            { label: "Margem média", value: `${margem}%`, icon: TrendingUp, color: "text-foreground" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${m.color}`} />
                  <span className="text-sm text-muted-foreground">{m.label}</span>
                </div>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            );
          })}
        </div>

        {/* Stats Row 2 — Growth */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Novos clientes", value: String(currentMonthClients), icon: Users },
            { label: "Templates ativados", value: String(activeSubs.length), icon: Package },
            { label: "Churn", value: String(cancelledSubs), icon: TrendingDown },
            { label: "MRR", value: fmt(receitaBruta), icon: DollarSign },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
              </div>
            );
          })}
        </div>

        {/* Revenue Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução da Receita (6 meses)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receita" name="Receita bruta" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lucro" name="Lucro líquido" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="custo" name="Custo plataforma" stroke="hsl(0, 72%, 51%)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown Table */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Template</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-right">Preço unit.</TableHead>
                <TableHead className="text-right">Receita bruta</TableHead>
                <TableHead className="text-right">Custo plat.</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueByTemplate.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum template ativo
                  </TableCell>
                </TableRow>
              ) : (
                revenueByTemplate.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.clients}</TableCell>
                    <TableCell className="text-right">{fmt(r.unitPrice)}</TableCell>
                    <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(r.cost)}</TableCell>
                    <TableCell className="text-right text-[hsl(var(--success))]">{fmt(r.revenue - r.cost)}</TableCell>
                    <TableCell className="text-right">
                      {r.revenue > 0 ? ((((r.revenue - r.cost) / r.revenue) * 100).toFixed(0)) : 0}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Transações Recentes</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma transação neste período
                  </TableCell>
                </TableRow>
              ) : (
                billingEvents.slice(0, 10).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{e.created_at ? format(new Date(e.created_at), "dd/MM/yyyy") : "-"}</TableCell>
                    <TableCell className="text-sm">{e.agency_clients?.client_name || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.description || "-"}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{fmt(Number(e.amount || 0))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        e.event_type === "payment_received" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                          : e.event_type === "payment_failed" ? "bg-destructive/10 text-destructive"
                            : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                      }>
                        {e.event_type === "payment_received" ? "Recebido" : e.event_type === "payment_failed" ? "Atrasado" : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Revenue Projection */}
        <Collapsible open={projOpen} onOpenChange={setProjOpen}>
          <div className="glass-card rounded-xl p-5">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-foreground w-full">
              <TrendingUp className="w-4 h-4 text-primary" />
              Projeção de receita
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${projOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Quantos clientes quero ter em 3 meses?</label>
                <Input
                  type="number"
                  min={1}
                  value={projClients}
                  onChange={(e) => setProjClients(Number(e.target.value) || 1)}
                  className="w-48 mt-1 h-9"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card rounded-lg p-4">
                  <span className="text-xs text-muted-foreground">Receita projetada</span>
                  <p className="text-lg font-bold text-primary">{fmt(projRevenue.revenue)}/mês</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <span className="text-xs text-muted-foreground">Custo projetado</span>
                  <p className="text-lg font-bold text-destructive">{fmt(projRevenue.cost)}/mês</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <span className="text-xs text-muted-foreground">Lucro projetado</span>
                  <p className="text-lg font-bold text-[hsl(var(--success))]">{fmt(projRevenue.profit)}/mês</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <span className="text-xs text-muted-foreground">Tier atingido</span>
                  <p className={`text-lg font-bold ${tierInfo[projRevenue.tier]?.color || ""}`}>
                    {tierInfo[projRevenue.tier]?.label.toUpperCase()}
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </DashboardLayout>
  );
};

export default Financeiro;
