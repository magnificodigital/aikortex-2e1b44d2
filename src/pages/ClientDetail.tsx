import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, Phone, FileText, Bot, LayoutTemplate,
  AlertTriangle, Ban, Trash2, Loader2, Zap as ZapIcon,
  UserPlus, User, Send, Activity, Gauge, Save, DollarSign, Pencil, KeyRound,
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

const CLIENT_MODULES = [
  { key: "aikortex.agentes", label: "Agentes" },
  { key: "aikortex.mensagens", label: "Mensagens" },
  { key: "aikortex.ligacoes", label: "Ligações" },
  { key: "aikortex.disparos", label: "Disparos" },
  { key: "aikortex.apps", label: "Apps" },
  { key: "aikortex.flows", label: "Flows" },
  { key: "stark.copilot", label: "Stark (copiloto)" },
];

const EVENT_LABELS: Record<string, string> = {
  payment_received: "Pagamento recebido",
  payment_failed: "Pagamento falhou",
  subscription_created: "Assinatura criada",
  subscription_cancelled: "Assinatura cancelada",
  refund: "Reembolso",
};

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellStarkOpen, setSellStarkOpen] = useState(false);
  const [clientUsers, setClientUsers] = useState<{ user_id: string; name: string; role: string; isOwner: boolean }[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [ownerMode, setOwnerMode] = useState(false);
  const [usersRefresh, setUsersRefresh] = useState(0);
  const [inviting, setInviting] = useState(false);
  const [modules, setModules] = useState<string[]>([]);
  // Editar template contratado
  const [editSub, setEditSub] = useState<any>(null);
  const [editPrice, setEditPrice] = useState("");
  const [savingSub, setSavingSub] = useState(false);
  // Configurações — dados da empresa + branding + senha do dono
  const [form, setForm] = useState({ client_name: "", client_email: "", client_phone: "", client_document: "", client_logo_url: "", client_primary_color: "#2563eb" });
  const [savingClient, setSavingClient] = useState(false);
  const [ownerPwd, setOwnerPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const applyClient = (data: any) => {
    setClient(data);
    setModules((data.enabled_modules as string[]) || []);
    setForm({
      client_name: data.client_name ?? "",
      client_email: data.client_email ?? "",
      client_phone: data.client_phone ?? "",
      client_document: data.client_document ?? "",
      client_logo_url: data.client_logo_url ?? "",
      client_primary_color: data.client_primary_color ?? "#2563eb",
    });
  };

  const reloadClient = async () => {
    if (!clientId) return;
    const { data } = await supabase.from("agency_clients").select("*").eq("id", clientId).single();
    if (data) applyClient(data);
  };

  useEffect(() => {
    const load = async () => {
      if (!clientId) return;
      const [cRes, sRes, eRes, aRes] = await Promise.all([
        supabase.from("agency_clients").select("*").eq("id", clientId).single(),
        supabase.from("client_template_subscriptions").select("*, platform_templates(name, category)").eq("client_id", clientId),
        supabase.from("billing_events").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("user_agents").select("id, name, agent_type, published_at, persona_emoji, model, provider").eq("client_id", clientId),
      ]);
      if (cRes.data) applyClient(cRes.data);
      if (sRes.data) setSubs(sRes.data);
      if (eRes.data) setEvents(eRes.data);
      if (aRes.data) setAgents(aRes.data);
      setLoading(false);
    };
    load();
  }, [clientId]);

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

  const openCreateOwner = () => { setOwnerMode(true); setShowCreateUser(true); };
  const openCreateMember = () => { setOwnerMode(false); setShowCreateUser(true); };

  const sendInvite = async () => {
    if (!client?.client_email) { toast.error("Cliente sem e-mail — preencha em Configurações."); return; }
    setInviting(true);
    const { error } = await supabase.functions.invoke("client-invite", { body: { client_id: clientId } });
    setInviting(false);
    if (error) { toast.error("Falha ao enviar convite."); return; }
    toast.success(`Convite enviado para ${client.client_email}.`);
  };

  const toggleModule = async (key: string) => {
    const next = modules.includes(key) ? modules.filter((m) => m !== key) : [...modules, key];
    setModules(next);
    const { error } = await supabase.from("agency_clients").update({ enabled_modules: next }).eq("id", clientId!);
    if (error) { toast.error("Falha ao salvar."); setModules(modules); }
  };

  const openEditSub = (s: any) => { setEditSub(s); setEditPrice(String(s.agency_price_monthly ?? "")); };
  const saveSub = async () => {
    if (!editSub) return;
    const price = Number(editPrice);
    if (isNaN(price) || price < 0) { toast.error("Valor inválido"); return; }
    setSavingSub(true);
    const { error } = await supabase.from("client_template_subscriptions").update({ agency_price_monthly: price }).eq("id", editSub.id);
    setSavingSub(false);
    if (error) { toast.error("Falha ao salvar."); return; }
    setSubs((prev) => prev.map((x) => x.id === editSub.id ? { ...x, agency_price_monthly: price } : x));
    setEditSub(null);
    toast.success("Serviço atualizado.");
  };
  const cancelSub = async () => {
    if (!editSub) return;
    setSavingSub(true);
    const { error } = await supabase.from("client_template_subscriptions").update({ status: "cancelled" }).eq("id", editSub.id);
    setSavingSub(false);
    if (error) { toast.error("Falha ao cancelar."); return; }
    setSubs((prev) => prev.map((x) => x.id === editSub.id ? { ...x, status: "cancelled" } : x));
    setEditSub(null);
    toast.success("Serviço cancelado.");
  };

  const saveClient = async () => {
    setSavingClient(true);
    const { error } = await supabase.from("agency_clients").update({
      client_name: form.client_name,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      client_document: form.client_document || null,
      client_logo_url: form.client_logo_url || null,
      client_primary_color: form.client_primary_color,
    }).eq("id", clientId!);
    setSavingClient(false);
    if (error) { toast.error("Falha ao salvar dados."); return; }
    toast.success("Dados do cliente salvos.");
    reloadClient();
  };

  const saveOwnerPassword = async () => {
    if (!client?.client_user_id) { toast.error("Cliente sem conta de acesso ainda."); return; }
    if (ownerPwd.length < 8) { toast.error("Senha deve ter no mínimo 8 caracteres."); return; }
    setSavingPwd(true);
    const { error } = await supabase.functions.invoke("update-user-password", {
      body: { user_id: client.client_user_id, new_password: ownerPwd },
    });
    setSavingPwd(false);
    if (error) { toast.error("Falha ao trocar a senha."); return; }
    setOwnerPwd("");
    toast.success("Senha do cliente atualizada.");
  };

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
  const publishedAgents = agents.filter((a) => a.published_at);
  const margin = totalTemplates - platformCost;
  const starkActive = (client.enabled_modules as string[] | null)?.includes("stark.copilot");

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

  const kpi = (icon: any, value: React.ReactNode, label: string) => {
    const Icon = icon;
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ModuleGate moduleKey="gestao.clientes">
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{client.client_name}</h1>
              <Badge variant="outline" className={`${st.class} border`}>{st.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client.client_email}</p>
          </div>
        </div>

        <SellStarkDialog open={sellStarkOpen} onOpenChange={setSellStarkOpen} clientId={clientId!} clientName={client.client_name} onSold={reloadClient} />
        <CreateUserDialog
          open={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => { setUsersRefresh((v) => v + 1); reloadClient(); }}
          context="client"
          clientId={clientId!}
          asOwner={ownerMode}
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="billing">Financeiro</TabsTrigger>
            <TabsTrigger value="modules">Funcionalidades</TabsTrigger>
            <TabsTrigger value="usage">Uso</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpi(Bot, publishedAgents.length, "Agentes no ar")}
              {kpi(LayoutTemplate, activeSubs.length, "Serviços ativos")}
              {kpi(DollarSign, `R$ ${totalTemplates.toFixed(0)}`, "Receita/mês")}
              {kpi(User, clientUsers.length, "Usuários")}
            </div>
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Custo plataforma</span><span>R$ {platformCost.toFixed(0)}/mês</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cobrado do cliente</span><span>R$ {totalTemplates.toFixed(0)}/mês</span></div>
                  <div className="flex justify-between font-bold border-t pt-2 text-green-600"><span>Sua margem</span><span>R$ {margin.toFixed(0)}/mês</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Serviços = Agentes + Templates + Stark */}
          <TabsContent value="services" className="space-y-4">
            {/* Agentes */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Agentes ({agents.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => navigate("/aikortex/agents", { state: { clientId, clientName: client.client_name } })}>
                    <Bot className="w-3.5 h-3.5 mr-1.5" /> Novo agente
                  </Button>
                </div>
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum agente atribuído a este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {agents.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/aikortex/agents/${a.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">{a.persona_emoji || "🤖"}</div>
                          <div><p className="text-sm font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.agent_type || "agente"} · {a.model || a.provider || "—"}</p></div>
                        </div>
                        {a.published_at ? <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">No ar</Badge> : <Badge variant="outline" className="text-xs">Rascunho</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stark */}
            <Card>
              <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><ZapIcon className="w-4 h-4 text-primary" /></div>
                  <div><p className="text-sm font-medium">Stark — copiloto de IA</p><p className="text-xs text-muted-foreground">Assistente de voz/texto para o cliente.</p></div>
                </div>
                {starkActive
                  ? <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Ativo</Badge>
                  : <Button size="sm" onClick={() => setSellStarkOpen(true)}><ZapIcon className="w-3.5 h-3.5 mr-1.5" /> Vender Stark</Button>}
              </CardContent>
            </Card>

            {/* Templates contratados */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3">Templates contratados ({subs.length})</h3>
                {subs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum template contratado.</p>
                ) : (
                  <div className="space-y-2">
                    {subs.map((s: any) => {
                      const subSt = STATUS_MAP[s.status] ?? STATUS_MAP.pending;
                      const trialDays = s.trial_ends_at ? Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
                      return (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 flex-wrap gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{s.platform_templates?.name ?? "Template"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`${subSt.class} border text-xs`}>{subSt.label}</Badge>
                              {s.status === "trial" && trialDays > 0 && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {trialDays} dias</span>}
                              {s.activated_channel && <Badge variant="secondary" className="text-xs">{s.activated_channel}</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-bold text-foreground">R$ {Number(s.agency_price_monthly).toFixed(0)}/mês</p>
                              <p className="text-xs text-muted-foreground">Custo: R$ {Number(s.platform_price_monthly).toFixed(0)}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEditSub(s)}><Pencil className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold">Usuários do cliente ({clientUsers.length})</h3>
                  {client.client_user_id ? (
                    <Button size="sm" variant="outline" onClick={openCreateMember}><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Novo usuário</Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={openCreateOwner}><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Criar acesso</Button>
                      <Button size="sm" variant="ghost" onClick={sendInvite} disabled={inviting}>
                        {inviting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />} ou enviar convite
                      </Button>
                    </div>
                  )}
                </div>
                {clientUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {client.client_user_id ? "Nenhum usuário ainda." : "Este cliente ainda não tem conta. Crie o acesso (email + senha) ou envie um convite."}
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {clientUsers.map((u) => (
                      <div key={u.user_id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><User className="w-3.5 h-3.5 text-muted-foreground" /></div>
                          <span className="text-sm font-medium">{u.name}</span>
                        </div>
                        {u.isOwner ? <Badge className="bg-primary/10 text-primary border-0 text-xs">Dono</Badge> : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{u.role}</Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Remover do cliente" onClick={() => removeMember(u.user_id)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {client.client_user_id && (
                  <p className="text-xs text-muted-foreground mt-3">Para trocar a senha do dono, use a aba Configurações.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="billing" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {kpi(DollarSign, `R$ ${totalTemplates.toFixed(0)}`, "Cobrado/mês")}
              {kpi(DollarSign, `R$ ${platformCost.toFixed(0)}`, "Custo/mês")}
              {kpi(Gauge, `R$ ${margin.toFixed(0)}`, "Margem/mês")}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de pagamentos</CardTitle></CardHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {events.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-sm">{e.description || EVENT_LABELS[e.event_type] || e.event_type}</TableCell>
                      <TableCell className="text-sm font-medium">R$ {Number(e.amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className={e.event_type === "payment_received" ? "bg-green-500/10 text-green-600 border-green-500/20 border" : "border"}>{e.event_type === "payment_received" ? "Pago" : (EVENT_LABELS[e.event_type] || e.event_type)}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado ainda.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Funcionalidades */}
          <TabsContent value="modules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funcionalidades liberadas</CardTitle>
                <p className="text-sm text-muted-foreground">Controle o que este cliente vê e usa no workspace dele.</p>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {CLIENT_MODULES.map((m) => (
                  <div key={m.key} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">{m.label}</span>
                    <Switch checked={modules.includes(m.key)} onCheckedChange={() => toggleModule(m.key)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Uso */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpi(Bot, agents.length, "Agentes")}
              {kpi(Activity, publishedAgents.length, "No ar")}
              {kpi(LayoutTemplate, activeSubs.length, "Serviços ativos")}
              {kpi(User, clientUsers.length, "Usuários")}
            </div>
            <Card><CardContent className="p-5 text-sm text-muted-foreground">O consumo detalhado de mensagens e tokens é medido no workspace do cliente (BYOK — a chave de IA usada é a que a agência/cliente conecta).</CardContent></Card>
          </TabsContent>

          {/* Atividade */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardContent className="p-5">
                {events.length === 0 && !client.created_at ? (
                  <p className="text-sm text-muted-foreground">Sem atividade registrada ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {client.created_at && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div><p className="text-sm font-medium">Cliente cadastrado</p><p className="text-xs text-muted-foreground">{new Date(client.created_at).toLocaleDateString("pt-BR")}</p></div>
                      </div>
                    )}
                    {events.map((e: any) => (
                      <div key={e.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                        <div><p className="text-sm font-medium">{EVENT_LABELS[e.event_type] || e.event_type}{e.amount ? ` — R$ ${Number(e.amount).toFixed(2)}` : ""}</p><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("pt-BR")}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nome</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
                  <div><Label>E-mail</Label><Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} /></div>
                  <div><Label>Documento (CNPJ/CPF)</Label><Input value={form.client_document} onChange={(e) => setForm({ ...form, client_document: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Logo URL</Label><Input value={form.client_logo_url} onChange={(e) => setForm({ ...form, client_logo_url: e.target.value })} placeholder="https://..." /></div>
                  <div><Label>Cor primária</Label><Input type="color" value={form.client_primary_color} onChange={(e) => setForm({ ...form, client_primary_color: e.target.value })} className="w-20 h-10" /></div>
                </div>
                <Button size="sm" onClick={saveClient} disabled={savingClient}>{savingClient ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Salvar dados</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Senha do dono</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {client.client_user_id ? (
                  <div className="flex gap-2">
                    <Input type="password" value={ownerPwd} onChange={(e) => setOwnerPwd(e.target.value)} placeholder="Nova senha (mín. 8)" className="max-w-xs" />
                    <Button size="sm" variant="outline" onClick={saveOwnerPassword} disabled={savingPwd || ownerPwd.length < 8}>{savingPwd && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Redefinir</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">O cliente ainda não tem conta. Crie o acesso na aba Usuários.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-base text-destructive">Zona de Perigo</CardTitle></CardHeader>
              <CardContent className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={handleSuspend}><Ban className="w-4 h-4 mr-1" /> Suspender cliente</Button>
                <Button variant="destructive" onClick={handleRemove}><Trash2 className="w-4 h-4 mr-1" /> Remover cliente</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Editar template contratado */}
        <Dialog open={!!editSub} onOpenChange={(o) => !o && setEditSub(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Editar serviço</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm font-medium">{editSub?.platform_templates?.name ?? "Template"}</p>
              <div><Label>Preço mensal cobrado do cliente (R$)</Label><Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></div>
              <p className="text-xs text-muted-foreground">Custo da plataforma: R$ {Number(editSub?.platform_price_monthly ?? 0).toFixed(2)} — sua margem é a diferença.</p>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button variant="destructive" size="sm" onClick={cancelSub} disabled={savingSub}>Cancelar assinatura</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditSub(null)}>Fechar</Button>
                <Button size="sm" onClick={saveSub} disabled={savingSub}>{savingSub && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salvar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
    </ModuleGate>
  );
};

export default ClientDetail;
