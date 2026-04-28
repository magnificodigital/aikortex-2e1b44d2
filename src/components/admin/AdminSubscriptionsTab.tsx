import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, DollarSign, Clock, XCircle } from "lucide-react";

interface SubRow {
  id: string;
  user_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
  profile?: { full_name: string | null };
  plan?: { name: string; price_monthly: number } | null;
}

const AdminSubscriptionsTab = () => {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSubs(); }, []);

  const fetchSubs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*, plans:plan_id(name, price_monthly)") as any;

    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profMap: Record<string, string> = {};
    profiles?.forEach((p: any) => { profMap[p.user_id] = p.full_name || "—"; });

    const merged = (data || []).map((s: any) => ({
      ...s,
      plan: s.plans,
      profile: { full_name: profMap[s.user_id] || "—" },
    }));
    setSubs(merged);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success("Status atualizado");
    fetchSubs();
  };

  const total = subs.length;
  const trialing = subs.filter(s => s.status === "trialing").length;
  const canceled = subs.filter(s => s.status === "canceled").length;
  const mrr = subs.filter(s => s.status === "active").reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0);

  const statusColors: Record<string, string> = {
    trialing: "bg-yellow-500/10 text-yellow-600",
    active: "bg-green-500/10 text-green-600",
    past_due: "bg-red-500/10 text-red-600",
    canceled: "bg-muted text-muted-foreground",
    paused: "bg-orange-500/10 text-orange-600",
  };
  const statusLabels: Record<string, string> = {
    trialing: "Trial", active: "Ativo", past_due: "Inadimplente", canceled: "Cancelado", paused: "Pausado",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{total}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><DollarSign className="w-5 h-5 text-green-600" /><div><p className="text-xs text-muted-foreground">MRR Estimado</p><p className="text-lg font-bold">R$ {mrr.toFixed(2)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="w-5 h-5 text-yellow-600" /><div><p className="text-xs text-muted-foreground">Em Trial</p><p className="text-lg font-bold">{trialing}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><XCircle className="w-5 h-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Cancelados</p><p className="text-lg font-bold">{canceled}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Próx. Cobrança</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : subs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma assinatura</TableCell></TableRow>
              ) : subs.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.profile?.full_name}</TableCell>
                  <TableCell>{s.plan?.name || "—"}</TableCell>
                  <TableCell><Badge className={`${statusColors[s.status] || ""} border-0 text-xs`}>{statusLabels[s.status] || s.status}</Badge></TableCell>
                  <TableCell className="capitalize">{s.billing_cycle === "monthly" ? "Mensal" : "Anual"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.current_period_start ? new Date(s.current_period_start).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Select value={s.status} onValueChange={v => updateStatus(s.id, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativar</SelectItem>
                        <SelectItem value="paused">Pausar</SelectItem>
                        <SelectItem value="canceled">Cancelar</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptionsTab;
