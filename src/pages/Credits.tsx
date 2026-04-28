import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonthlyUsage } from "@/hooks/use-monthly-usage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Key, Activity, History, Settings, CheckCircle2, ExternalLink, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  refund: "Reembolso",
  bonus: "Bônus",
  manual: "Manual",
};

const typeBadgeClass: Record<string, string> = {
  purchase: "bg-green-500/10 text-green-600 border-0",
  consumption: "bg-blue-500/10 text-blue-600 border-0",
  refund: "bg-orange-500/10 text-orange-600 border-0",
  bonus: "bg-purple-500/10 text-purple-600 border-0",
  manual: "bg-muted text-muted-foreground border-0",
};

const providers = [
  { key: "openai", label: "OpenAI", desc: "GPT-4o, GPT-4 Turbo e mais" },
  { key: "anthropic", label: "Anthropic", desc: "Claude 4 Sonnet, Opus, Haiku" },
  { key: "gemini", label: "Google Gemini", desc: "Gemini 2.5 Pro/Flash" },
  { key: "openrouter", label: "OpenRouter", desc: "Acesse centenas de modelos" },
];

const Credits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messageCount, monthlyLimit, hasByok, isUnlimited, planSlug, isLoading: usageLoading } = useMonthlyUsage();
  const [typeFilter, setTypeFilter] = useState("all");

  // Check which providers have BYOK configured
  const { data: configuredKeys = [] } = useQuery({
    queryKey: ["user-byok-keys", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_api_keys")
        .select("provider")
        .eq("user_id", user!.id)
        .in("provider", ["openai", "anthropic", "gemini", "openrouter"]);
      return (data || []).map((k) => k.provider);
    },
  });

  // Reuse credit_transactions as usage history
  const { data: transactions = [] } = useQuery({
    queryKey: ["usage-history", user?.id, typeFilter],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const usagePercent = isUnlimited || monthlyLimit <= 0 ? 0 : Math.min(100, (messageCount / monthlyLimit) * 100);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuração de IA</h1>
            <p className="text-sm text-muted-foreground">Gerencie como seus agentes e automações utilizam inteligência artificial.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 — BYOK */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-primary" /> Use sua própria chave de API
              </CardTitle>
              <CardDescription>
                Conecte sua conta da OpenAI, Anthropic ou Google e use sem limites mensais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasByok && (
                <Badge className="bg-green-500/10 text-green-600 border-0 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> BYOK ativo
                </Badge>
              )}
              <div className="space-y-2">
                {providers.map((p) => {
                  const isConfigured = configuredKeys.includes(p.key);
                  return (
                    <div key={p.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" /> Conectado
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1"
                          onClick={() => navigate("/settings?tab=integrations")}
                        >
                          <ExternalLink className="w-3 h-3" /> {isConfigured ? "Gerenciar" : "Configurar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Card 2 — Uso da plataforma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-primary" /> Uso da plataforma
              </CardTitle>
              <CardDescription>
                Modelos do Aikortex — plano <span className="font-medium capitalize">{planSlug}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Mensagens este mês</span>
                  <span className="text-sm font-semibold">
                    {usageLoading ? "..." : messageCount} / {isUnlimited ? "∞" : monthlyLimit}
                  </span>
                </div>
                {!isUnlimited && <Progress value={usagePercent} className="h-2" />}
                {isUnlimited && (
                  <p className="text-xs text-green-600 font-medium">Uso ilimitado no seu plano</p>
                )}
              </div>

              {!hasByok && planSlug === "starter" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-sm text-foreground">
                    Quer mais mensagens? Configure uma chave de API própria ou faça upgrade.
                  </p>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/pricing")}>
                    <TrendingUp className="w-3 h-3" /> Ver planos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <History className="w-3.5 h-3.5" /> Histórico de uso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="consumption">Consumo</SelectItem>
                  <SelectItem value="bonus">Bônus</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Provedor / Modelo</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum registro de uso encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {format(new Date(tx.created_at!), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge className={typeBadgeClass[tx.type] ?? ""}>{typeLabels[tx.type] ?? tx.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{tx.description ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[tx.provider, tx.model].filter(Boolean).join(" / ") || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {(tx.tokens_input || 0) + (tx.tokens_output || 0) > 0
                            ? `${((tx.tokens_input || 0) + (tx.tokens_output || 0)).toLocaleString("pt-BR")}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Credits;
