import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, DollarSign, LayoutTemplate, Trophy } from "lucide-react";

const TIER_LABELS: Record<string, string> = { starter: "Starter", explorer: "Explorer", hack: "Hack" };

const AgencyOverview = () => {
  const { user } = useAuth();
  const [agency, setAgency] = useState<any>(null);
  const [clientCount, setClientCount] = useState(0);
  const [subCount, setSubCount] = useState(0);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: ag } = await supabase.from("agency_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!ag) return;
      setAgency(ag);

      const [clRes, subRes] = await Promise.all([
        supabase.from("agency_clients").select("id", { count: "exact" }).eq("agency_id", ag.id).eq("status", "active"),
        supabase.from("client_template_subscriptions").select("agency_price_monthly, status").eq("agency_id", ag.id).in("status", ["active", "trial"]),
      ]);
      setClientCount(clRes.count ?? 0);
      if (subRes.data) {
        setSubCount(subRes.data.length);
        setRevenue(subRes.data.reduce((s: number, r: any) => s + Number(r.agency_price_monthly), 0));
      }
    };
    load();
  }, [user]);

  if (!agency) return null;

  const tier = agency.tier ?? "starter";
  const ac = agency.active_clients_count ?? 0;
  const tierPct = tier === "hack" ? 100 : tier === "explorer" ? Math.min(100, (ac / 15) * 100) : Math.min(100, (ac / 5) * 100);
  const tierLabel = tier === "hack" ? "Nível máximo 🏆" : tier === "explorer" ? `${ac}/15 → Hack` : `${ac}/5 → Explorer`;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Visão Geral da Agência</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary shrink-0" />
          <div><p className="text-xs text-muted-foreground">Clientes ativos</p><p className="text-xl font-bold text-foreground">{clientCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-green-600 shrink-0" />
          <div><p className="text-xs text-muted-foreground">Receita mensal</p><p className="text-xl font-bold text-foreground">R$ {revenue.toFixed(0)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <LayoutTemplate className="w-5 h-5 text-blue-600 shrink-0" />
          <div><p className="text-xs text-muted-foreground">Templates vendidos</p><p className="text-xl font-bold text-foreground">{subCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Tier {TIER_LABELS[tier]}</p>
            <Progress value={tierPct} className="h-1.5 mt-1" />
            <p className="text-[10px] text-muted-foreground mt-0.5">{tierLabel}</p>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
};

export default AgencyOverview;
