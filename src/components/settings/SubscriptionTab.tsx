import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, ArrowUpRight, Receipt, Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  trialing: { label: "Período de teste", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  canceled: { label: "Cancelado", variant: "outline" },
  paused: { label: "Pausado", variant: "secondary" },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-600" },
  paid: { label: "Pago", className: "bg-green-500/10 text-green-600" },
  overdue: { label: "Atrasado", className: "bg-red-500/10 text-red-600" },
  canceled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

const SubscriptionTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, plan, isLoading, isTrialing, isActive } = useSubscription();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Nenhum plano ativo</CardTitle>
          <CardDescription>
            Escolha um plano para desbloquear todo o potencial do Aikortex
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate("/pricing")} className="gap-2">
            <CreditCard className="w-4 h-4" /> Ver planos
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[subscription.status] ?? statusConfig.active;
  const fmtDate = (d: string | null) =>
    d ? format(new Date(d), "dd MMM yyyy", { locale: ptBR }) : "—";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Plano {plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </div>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Ciclo</p>
              <p className="text-sm font-medium text-foreground capitalize">{subscription.billing_cycle === "monthly" ? "Mensal" : "Anual"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-sm font-medium text-foreground">
                R${subscription.billing_cycle === "monthly" ? plan.price_monthly.toFixed(0) : plan.price_yearly.toFixed(0)}/{subscription.billing_cycle === "monthly" ? "mês" : "ano"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Período atual</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(subscription.current_period_start)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Próxima cobrança</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(subscription.current_period_end)}</p>
            </div>
          </div>

          {isTrialing && subscription.trial_ends_at && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-500/10 p-3 rounded-lg">
              <Calendar className="w-4 h-4" />
              <span>Seu teste gratuito termina em {fmtDate(subscription.trial_ends_at)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={() => navigate("/pricing")} className="gap-2">
              <ArrowUpRight className="w-4 h-4" /> Fazer Upgrade
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Receipt className="w-4 h-4" /> Ver Faturas
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Histórico de Faturas</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma fatura encontrada
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv: any) => {
                          const invStatus = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.pending;
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="text-xs">
                                {format(new Date(inv.created_at), "dd/MM/yy")}
                              </TableCell>
                              <TableCell className="text-xs">{inv.description ?? "Assinatura"}</TableCell>
                              <TableCell className="text-xs font-medium">
                                R${Number(inv.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${invStatus.className}`} variant="outline">
                                  {invStatus.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limites do plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(plan.limits).map(([key, val]) => (
              <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-foreground">{val === -1 ? "∞" : val}</p>
                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionTab;
