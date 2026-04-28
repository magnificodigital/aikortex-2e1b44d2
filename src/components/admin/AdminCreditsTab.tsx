import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Activity, Key, Users, TrendingUp } from "lucide-react";

const AdminCreditsTab = () => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-usage-dashboard"],
    queryFn: async () => {
      const yearMonth = new Date().toISOString().slice(0, 7);

      // Fetch profiles, usage, subscriptions+plans, BYOK keys in parallel
      const [profilesRes, usageRes, subsRes, keysRes, limitsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, role"),
        supabase.from("monthly_usage").select("user_id, message_count").eq("year_month", yearMonth),
        supabase.from("subscriptions").select("user_id, plan_id, plans(slug, name)").in("status", ["active", "trialing"]),
        supabase.from("user_api_keys").select("user_id, provider").in("provider", ["openai", "anthropic", "gemini", "openrouter"]),
        supabase.from("plan_message_limits").select("plan_slug, monthly_limit"),
      ]);

      const profiles = profilesRes.data ?? [];
      const usage = usageRes.data ?? [];
      const subs = subsRes.data ?? [];
      const keys = keysRes.data ?? [];
      const limits = limitsRes.data ?? [];

      const usageMap = new Map(usage.map((u) => [u.user_id, u.message_count]));
      const subMap = new Map(subs.map((s) => [s.user_id, s]));
      const limitMap = new Map(limits.map((l) => [l.plan_slug, l.monthly_limit]));

      // Group BYOK keys by user
      const byokMap = new Map<string, string[]>();
      for (const k of keys) {
        const arr = byokMap.get(k.user_id) || [];
        arr.push(k.provider);
        byokMap.set(k.user_id, arr);
      }

      // Filter to agency users only
      const agencyProfiles = profiles.filter((p) =>
        !["platform_owner", "platform_admin"].includes(p.role)
      );

      return agencyProfiles.map((p) => {
        const sub = subMap.get(p.user_id);
        const planSlug = (sub?.plans as any)?.slug || "starter";
        const planName = (sub?.plans as any)?.name || "Starter";
        const monthlyLimit = limitMap.get(planSlug) ?? 500;
        const messageCount = usageMap.get(p.user_id) ?? 0;
        const byokProviders = byokMap.get(p.user_id) ?? [];

        return {
          userId: p.user_id,
          name: p.full_name || p.user_id,
          planName,
          planSlug,
          monthlyLimit,
          messageCount,
          hasByok: byokProviders.length > 0,
          byokProviders,
        };
      });
    },
  });

  const totalMessages = rows.reduce((s, r) => s + r.messageCount, 0);
  const totalByok = rows.filter((r) => r.hasByok).length;
  const totalNearLimit = rows.filter(
    (r) => !r.hasByok && r.monthlyLimit !== -1 && r.messageCount >= r.monthlyLimit * 0.9
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Agências ativas</p>
              <p className="text-xl font-bold text-foreground">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Mensagens este mês</p>
              <p className="text-xl font-bold text-foreground">{totalMessages.toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Key className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Com chave própria (BYOK)</p>
              <p className="text-xl font-bold text-foreground">
                {totalByok} <span className="text-sm font-normal text-muted-foreground">/ {rows.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalNearLimit > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm text-foreground">
            <TrendingUp className="w-4 h-4 inline mr-1 text-amber-500" />
            <strong>{totalNearLimit}</strong> agência(s) estão próximas ou atingiram o limite mensal.
          </p>
        </div>
      )}

      {/* Usage Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agência</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Uso mensal</TableHead>
              <TableHead className="text-center">BYOK</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma agência encontrada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const isUnlimited = r.monthlyLimit === -1;
                const usagePercent = isUnlimited ? 0 : Math.min(100, (r.messageCount / r.monthlyLimit) * 100);
                const isAtLimit = !isUnlimited && !r.hasByok && r.messageCount >= r.monthlyLimit;
                const isNear = !isUnlimited && !r.hasByok && r.messageCount >= r.monthlyLimit * 0.9;

                return (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{r.planName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs">
                          <span>{r.messageCount.toLocaleString("pt-BR")}</span>
                          <span className="text-muted-foreground">
                            / {isUnlimited ? "∞" : r.monthlyLimit.toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {!isUnlimited && <Progress value={usagePercent} className="h-1.5" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.hasByok ? (
                        <Badge className="bg-green-500/10 text-green-600 border-0 gap-1 text-[10px]">
                          <Key className="w-3 h-3" /> {r.byokProviders.join(", ")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.hasByok ? (
                        <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">Ilimitado</Badge>
                      ) : isAtLimit ? (
                        <Badge className="bg-red-500/10 text-red-500 border-0 text-[10px]">Limite atingido</Badge>
                      ) : isNear ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">Próximo do limite</Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminCreditsTab;
