import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Receipt, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type BillingEvent = {
  id: string;
  agent_id: string;
  event_type: string;
  gross_amount_cents: number;
  agency_amount_cents: number;
  platform_amount_cents: number;
  client_external_ref: string | null;
  created_at: string;
  agent: { name: string; client_info: { name?: string } | null } | null;
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PERIODS = [
  { value: "current_month", label: "Mês atual" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_3_months", label: "Últimos 3 meses" },
  { value: "all_time", label: "Total geral" },
];

export default function RevenueDashboard() {
  const [period, setPeriod] = useState("current_month");
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function load() {
    setLoading(true);
    try {
      const now = new Date();
      let from: Date | null = null;
      if (period === "current_month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === "last_month") {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      } else if (period === "last_3_months") {
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEvents([]); setLoading(false); return; }

      let query = supabase
        .from("agent_billing_events")
        .select("id, agent_id, event_type, gross_amount_cents, agency_amount_cents, platform_amount_cents, client_external_ref, created_at, agent:user_agents(name, client_info)")
        .eq("agency_user_id", user.id)
        .order("created_at", { ascending: false });

      if (from) query = query.gte("created_at", from.toISOString());

      // Mes passado tem limite superior tambem (primeiro dia do mes atual)
      if (period === "last_month") {
        const upper = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.lt("created_at", upper.toISOString());
      }

      const { data, error } = await query;
      if (error) console.warn("[revenue] load error:", error.message);
      setEvents((data ?? []) as unknown as BillingEvent[]);
    } finally {
      setLoading(false);
    }
  }

  // Aggregations
  const totalGross = events.reduce((s, e) => s + (e.gross_amount_cents || 0), 0);
  const totalAgency = events.reduce((s, e) => s + (e.agency_amount_cents || 0), 0);
  const totalPlatform = events.reduce((s, e) => s + (e.platform_amount_cents || 0), 0);
  const paymentEventCount = events.filter((e) =>
    e.event_type === "PAYMENT_CONFIRMED" || e.event_type === "PAYMENT_RECEIVED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">Receita</h2>
          <p className="text-xs text-muted-foreground">
            Master v7.4 §3 — receita gerada pelos agentes publicados, com split nativo via Asaas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-md border transition-colors ${
                period === p.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-accent/50 text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Bruto cobrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-32" /> : (
              <p className="text-2xl font-bold text-foreground">{formatBRL(totalGross)}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {paymentEventCount} pagamento{paymentEventCount === 1 ? "" : "s"} confirmado{paymentEventCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider text-emerald-500 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Sua parte
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-32" /> : (
              <p className="text-2xl font-bold text-emerald-500">{formatBRL(totalAgency)}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Já caiu na tua wallet via split
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Aikortex
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-32" /> : (
              <p className="text-2xl font-bold text-muted-foreground">{formatBRL(totalPlatform)}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Comissão da plataforma</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentações</CardTitle>
          <CardDescription className="text-xs">
            Cada pagamento confirmado pelos clientes finais gera 1 linha. Estornos aparecem em vermelho.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma movimentação no período</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Publique agentes pra começar a receber pagamentos recorrentes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((e) => {
                const isRefund = e.event_type === "PAYMENT_REFUNDED" || e.gross_amount_cents < 0;
                return (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-accent/20">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {e.agent?.name || "Agente removido"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {e.agent?.client_info?.name || e.client_external_ref || "—"} · {new Date(e.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isRefund ? "text-destructive" : "text-emerald-500"}`}>
                        {isRefund ? "" : "+"}{formatBRL(e.agency_amount_cents)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isRefund ? "Estorno" : `Total ${formatBRL(e.gross_amount_cents)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
