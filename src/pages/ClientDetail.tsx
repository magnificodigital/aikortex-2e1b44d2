import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, Phone, FileText, DollarSign, LayoutTemplate,
  Settings, AlertTriangle, Ban, Trash2, Loader2, Zap as ZapIcon,
  UserPlus, User,
} from "lucide-react";
import { SellStarkDialog } from "@/components/clients/SellStarkDialog";
import CreateUserDialog from "@/components/shared/CreateUserDialog";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Ativo", class: "bg-green-500/10 text-green-600 border-green-500/20" },
  pending: { label: "Pendente", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  trial: { label: "Trial", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  suspended: { label: "Suspenso", class: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground border-border" },
};

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellStarkOpen, setSellStarkOpen] = useState(false);
  const [clientUsers, setClientUsers] = useState<{ user_id: string; name: string; role: string; isOwner: boolean }[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [usersRefresh, setUsersRefresh] = useState(0);

  const reloadClient = async () => {
    if (!clientId) return;
    const { data } = await supabase.from("agency_clients").select("*").eq("id", clientId).single();
    if (data) setClient(data);
  };

  // Usuários do cliente = dono (client_user_id) + membros (client_members).
  useEffect(() => {
    if (!clientId || !client) return;
    let active = true;
    (async () => {
      const { data: members } = await supabase.from("client_members" as any).select("user_id, role").eq("client_id", clientId);
      const memberRows = (members as any[]) || [];
      const ids = [client.client_user_id, ...memberRows.map((m) => m.user_id)].filter(Boolean) as string[];
      let profs: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        profs = data || [];
      }
      const nameOf = (uid: string) => profs.find((p) => p.user_id === uid)?.full_name || `${uid.slice(0, 8)}…`;
      const list: { user_id: string; name: string; role: string; isOwner: boolean }[] = [];
      if (client.client_user_id) list.push({ user_id: client.client_user_id, name: nameOf(client.client_user_id), role: "Dono", isOwner: true });
      for (const m of memberRows) list.push({ user_id: m.user_id, name: nameOf(m.user_id), role: m.role, isOwner: false });
      if (active) setClientUsers(list);
    })();
    return () => { active = false; };
  }, [clientId, client, usersRefresh]);

  const removeMember = async (userId: string) => {
    const { error } = await supabase.from("client_members" as any).delete().eq("client_id", clientId!).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Usuário removido do cliente.");
    setUsersRefresh((v) => v + 1);
  };

  useEffect(() => {
    const load = async () => {
      if (!clientId) return;
      const [cRes, sRes, eRes] = await Promise.all([
        supabase.from("agency_clients").select("*").eq("id", clientId).single(),
        supabase.from("client_template_subscriptions").select("*, platform_templates(name, category)").eq("client_id", clientId),
        supabase.from("billing_events").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      ]);
      if (cRes.data) setClient(cRes.data);
      if (sRes.data) setSubs(sRes.data);
      if (eRes.data) setEvents(eRes.data);
      setLoading(false);
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <ModuleGate moduleKey="gestao.clientes">
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
      </ModuleGate>
    );
  }

  if (!client) {
    return (
      <ModuleGate moduleKey="gestao.clientes">
      <DashboardLayout>
        <div className="p-6 text-center text-muted-foreground">Cliente não encontrado.</div>
      </DashboardLayout>
      </ModuleGate>
    );
  }

  const st = STATUS_MAP[client.status ?? "pending"] ?? STATUS_MAP.pending;
  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trial");
  const totalTemplates = activeSubs.reduce((sum: number, s: any) => sum + Number(s.agency_price_monthly), 0);
  const platformCost = activeSubs.reduce((sum: number, s: any) => sum + Number(s.platform_price_monthly), 0);

  const handleSuspend = async () => {
    await supabase.from("agency_clients").update({ status: "suspended" }).eq("id", clientId!);
    toast.success("Cliente suspenso");
    setClient({ ...client, status: "suspended" });
  };

  const handleRemove = async () => {
    await supabase.from("agency_clients").update({ status: "inactive" }).eq("id", clientId!);
    toast.success("Cliente removido");
    navigate("/clients");
  };

  return (
    <ModuleGate moduleKey="gestao.clientes">
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{client.client_name}</h1>
              <Badge variant="outline" className={`${st.class} border`}>{st.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client.client_email}</p>
          </div>
          {(client.enabled_modules as string[] | null)?.includes("stark.copilot") ? (
            <Badge variant="secondary" className="gap-1">
              <ZapIcon className="w-3 h-3" /> Stark ativo
            </Badge>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={() => setSellStarkOpen(true)}>
              <ZapIcon className="w-3.5 h-3.5" /> Vender Stark
            </Button>
          )}
        </div>

        <SellStarkDialog
          open={sellStarkOpen}
          onOpenChange={setSellStarkOpen}
          clientId={clientId!}
          clientName={client.client_name}
          onSold={reloadClient}
        />
        <CreateUserDialog
          open={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => setUsersRefresh((v) => v + 1)}
          context="client"
          clientId={clientId!}
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="billing">Financeiro</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{client.client_email || "-"}</div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{client.client_phone || "-"}</div>
                  <div className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-muted-foreground" />{client.client_document || "-"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Plataforma</span><span>R$ {platformCost.toFixed(0)}/mês</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Templates</span><span>R$ {totalTemplates.toFixed(0)}/mês</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Total mensal</span><span>R$ {(platformCost + totalTemplates).toFixed(0)}/mês</span></div>
                  <div className="flex justify-between text-green-600 font-medium"><span>Sua receita</span><span>R$ {(totalTemplates).toFixed(0)}/mês</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-4">
            {subs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum template assinado.</p>
            ) : (
              <div className="space-y-3">
                {subs.map((s: any) => {
                  const subSt = STATUS_MAP[s.status] ?? STATUS_MAP.pending;
                  const trialDays = s.trial_ends_at ? Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
                  return (
                    <Card key={s.id}>
                      <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.platform_templates?.name ?? "Template"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`${subSt.class} border text-xs`}>{subSt.label}</Badge>
                            {s.status === "trial" && trialDays > 0 && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {trialDays} dias restantes
                              </span>
                            )}
                            {s.activated_channel && <Badge variant="secondary" className="text-xs">{s.activated_channel}</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">R$ {Number(s.agency_price_monthly).toFixed(0)}/mês</p>
                          <p className="text-xs text-muted-foreground">Custo: R$ {Number(s.platform_price_monthly).toFixed(0)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Usuários do cliente */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Usuários do cliente ({clientUsers.length})</h3>
                  {client.client_user_id && (
                    <Button size="sm" variant="outline" onClick={() => setShowCreateUser(true)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Novo usuário
                    </Button>
                  )}
                </div>
                {clientUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {client.client_user_id ? "Nenhum usuário ainda." : "Este cliente ainda não tem conta de acesso."}
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {clientUsers.map((u) => (
                      <div key={u.user_id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><User className="w-3.5 h-3.5 text-muted-foreground" /></div>
                          <span className="text-sm font-medium">{u.name}</span>
                        </div>
                        {u.isOwner ? (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">Dono</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{u.role}</Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Remover do cliente" onClick={() => removeMember(u.user_id)}>
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing">
            <Card>
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
                  {events.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-sm">{e.description || e.event_type}</TableCell>
                      <TableCell className="text-sm font-medium">R$ {Number(e.amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={e.event_type === "payment_received" ? "bg-green-500/10 text-green-600 border-green-500/20 border" : "border"}>
                          {e.event_type === "payment_received" ? "Pago" : e.event_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum evento encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Branding do Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Logo URL</Label><Input defaultValue={client.client_logo_url ?? ""} placeholder="https://..." /></div>
                <div><Label>Cor primária</Label><Input type="color" defaultValue={client.client_primary_color ?? "#2563eb"} className="w-20 h-10" /></div>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-base text-destructive">Zona de Perigo</CardTitle></CardHeader>
              <CardContent className="flex gap-3">
                <Button variant="outline" onClick={handleSuspend}><Ban className="w-4 h-4 mr-1" /> Suspender cliente</Button>
                <Button variant="destructive" onClick={handleRemove}><Trash2 className="w-4 h-4 mr-1" /> Remover cliente</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </ModuleGate>
  );
};

export default ClientDetail;
