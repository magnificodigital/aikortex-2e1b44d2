import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search, Loader2, RefreshCw, Building2, CheckCircle, XCircle,
  ArrowLeft, Users, DollarSign, LayoutTemplate, ChevronRight, Plus, Pencil, Trash2, Ban, ShieldOff, Copy, KeyRound,
  MoreHorizontal, ShieldCheck, UserX, RotateCcw,
} from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROLE_CONFIG } from "@/types/rbac";
import EditUserDialog from "@/components/admin/EditUserDialog";
import CreateUserDialog from "@/components/shared/CreateUserDialog";

/* ────────────────────── types ────────────────────── */

interface AgencyRow {
  id: string; user_id: string; agency_name: string | null; logo_url: string | null;
  tier: string; active_clients_count: number | null; asaas_api_key: string | null;
  asaas_wallet_id: string | null; created_at: string | null; custom_pricing: any;
  email?: string; mrr?: number; platformRevenue?: number;
  tier_manually_overridden?: boolean;
}

interface ClientRow {
  id: string; client_name: string; client_email: string | null; client_phone: string | null;
  client_document: string | null; status: string | null; created_at: string | null;
  client_user_id: string | null; agency_id: string;
  templates: { id: string; name: string; agency_price: number; platform_price: number; status: string; channel: string | null; activated_at: string | null; subscription_id: string }[];
  mrr: number; platformRevenue: number;
}

interface UserRow {
  id: string; user_id: string; email: string | null; full_name: string | null;
  role: string; tenant_type: string; is_active: boolean; last_sign_in_at: string | null;
}

interface SubscriptionDetail {
  id: string; template_name: string; category: string; agency_price: number;
  platform_price: number; agency_profit: number; status: string; channel: string | null;
  activated_at: string | null; created_at: string | null;
  payments: { id: string; created_at: string | null; amount: number; platform_amount: number; status: string; asaas_id: string | null }[];
}

/* ────────────────────── helpers ────────────────────── */

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  starter: { label: "Starter", className: "bg-muted text-muted-foreground" },
  explorer: { label: "Explorer", className: "bg-blue-500/10 text-blue-600" },
  hack: { label: "Hack", className: "bg-purple-500/10 text-purple-600" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-500/10 text-green-600" },
  pending: { label: "Pendente", cls: "bg-yellow-500/10 text-yellow-600" },
  suspended: { label: "Suspenso", cls: "bg-red-500/10 text-red-500" },
  inactive: { label: "Inativo", cls: "bg-muted text-muted-foreground" },
  trial: { label: "Trial", cls: "bg-cyan-500/10 text-cyan-600" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/10 text-red-500" },
};

const relativeDate = (d: string | null) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  if (days < 365) return `${Math.floor(days / 30)}m atrás`;
  return new Date(d).toLocaleDateString("pt-BR");
};

const getTierProgress = (tier: string, clients: number) => {
  if (tier === "hack") return { target: 15, pct: 100, next: null };
  if (tier === "explorer") return { target: 15, pct: Math.min(100, (clients / 15) * 100), next: "Hack" };
  return { target: 5, pct: Math.min(100, (clients / 5) * 100), next: "Explorer" };
};

const generatePassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const adminInvoke = async (body: Record<string, any>) => {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    // Try to extract the real error message from the response context
    const msg = (data as any)?.error || error.message || "Erro desconhecido";
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

/* ────────────────────── Nav state ────────────────────── */
type NavLevel =
  | { level: 1 }
  | { level: 2; agency: AgencyRow }
  | { level: 3; agency: AgencyRow; client: ClientRow }
  | { level: 4; agency: AgencyRow; client: ClientRow; subscription: SubscriptionDetail };

interface GestaoProps {
  initialAgencyId?: string;
  initialClientId?: string;
  initialTier?: string;
}

/* ════════════════════════════════════════════════════════ */
const AdminGestaoTab = ({ initialAgencyId, initialClientId, initialTier }: GestaoProps) => {
  const [nav, setNav] = useState<NavLevel>({ level: 1 });
  const goBack = useCallback(() => {
    if (nav.level === 4) setNav({ level: 3, agency: nav.agency, client: nav.client });
    else if (nav.level === 3) setNav({ level: 2, agency: nav.agency });
    else setNav({ level: 1 });
  }, [nav]);

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="cursor-pointer" onClick={() => setNav({ level: 1 })}>Gestão</BreadcrumbLink>
          </BreadcrumbItem>
          {nav.level >= 2 && "agency" in nav && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {nav.level === 2 ? <BreadcrumbPage>{nav.agency.agency_name || "Agência"}</BreadcrumbPage> :
                  <BreadcrumbLink className="cursor-pointer" onClick={() => setNav({ level: 2, agency: nav.agency })}>{nav.agency.agency_name || "Agência"}</BreadcrumbLink>}
              </BreadcrumbItem>
            </>
          )}
          {nav.level >= 3 && "client" in nav && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {nav.level === 3 ? <BreadcrumbPage>{nav.client.client_name}</BreadcrumbPage> :
                  <BreadcrumbLink className="cursor-pointer" onClick={() => setNav({ level: 3, agency: nav.agency, client: nav.client })}>{nav.client.client_name}</BreadcrumbLink>}
              </BreadcrumbItem>
            </>
          )}
          {nav.level === 4 && (
            <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{nav.subscription.template_name}</BreadcrumbPage></BreadcrumbItem></>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {nav.level > 1 && (
        <Button variant="ghost" size="sm" onClick={goBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      )}

      {nav.level === 1 && <Level1 onSelectAgency={(a) => setNav({ level: 2, agency: a })} initialTier={initialTier} initialAgencyId={initialAgencyId} />}
      {nav.level === 2 && <Level2 agency={nav.agency} onSelectClient={(c) => setNav({ level: 3, agency: nav.agency, client: c })} onAgencyUpdated={(a) => setNav({ level: 2, agency: a })} />}
      {nav.level === 3 && <Level3 agency={nav.agency} client={nav.client} onSelectSubscription={(s) => setNav({ level: 4, agency: nav.agency, client: nav.client, subscription: s })} onGoToAgency={() => setNav({ level: 2, agency: nav.agency })} onClientUpdated={(c) => setNav({ level: 3, agency: nav.agency, client: c })} />}
      {nav.level === 4 && <Level4 subscription={nav.subscription} />}
    </div>
  );
};

/* ═══════════════════ CREATE AGENCY MODAL ═══════════════════ */

const CreateAgencyModal = ({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [tier, setTier] = useState("starter");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) { toast.error("Nome e e-mail são obrigatórios"); return; }
    setSaving(true);
    try {
      await adminInvoke({ action: "create", email, password, full_name: name, role: "agency_owner", tenant_type: "agency", agency_name: name, tier });
      setCreated(true);
      toast.success("Agência criada com sucesso!");
      onSuccess();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleClose = () => { setCreated(false); setName(""); setEmail(""); setPassword(generatePassword()); setTier("starter"); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? "Agência criada!" : "Criar nova agência"}</DialogTitle>
          <DialogDescription>{created ? "Copie as credenciais abaixo." : "Preencha os dados da nova agência."}</DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
              <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {email}</p>
              <p className="text-sm"><span className="text-muted-foreground">Senha:</span> {password}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`E-mail: ${email}\nSenha: ${password}`); toast.success("Copiado!"); }}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar credenciais
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div><Label>Nome da agência *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da agência" /></div>
            <div><Label>E-mail do responsável *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@agencia.com" /></div>
            <div>
              <Label>Senha temporária *</Label>
              <div className="flex gap-2">
                <Input value={password} onChange={e => setPassword(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => setPassword(generatePassword())}><RefreshCw className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(password); toast.success("Copiado!"); }}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
            <div><Label>Tier inicial</Label>
              <Select value={tier} onValueChange={setTier}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="explorer">Explorer</SelectItem><SelectItem value="hack">Hack</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          {created ? <Button onClick={handleClose}>Fechar</Button> : (
            <><Button variant="outline" onClick={handleClose}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Criar agência</Button></>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ EDIT AGENCY MODAL ═══════════════════ */

const EditAgencyModal = ({ open, onClose, agency, onSuccess }: { open: boolean; onClose: () => void; agency: AgencyRow | null; onSuccess: (updated: AgencyRow) => void }) => {
  const [name, setName] = useState("");
  const [tier, setTier] = useState("starter");
  const [override, setOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agency) { setName(agency.agency_name || ""); setTier(agency.tier); setOverride(agency.tier_manually_overridden || false); }
  }, [agency]);

  const handleSave = async () => {
    if (!agency) return;
    setSaving(true);
    try {
      await adminInvoke({ action: "update-agency", agency_id: agency.id, agency_name: name, tier, tier_manually_overridden: override });
      toast.success("Agência atualizada!");
      onSuccess({ ...agency, agency_name: name, tier, tier_manually_overridden: override });
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleRemoveOverride = async () => {
    if (!agency) return;
    setSaving(true);
    try {
      await adminInvoke({ action: "update-agency", agency_id: agency.id, tier_manually_overridden: false });
      setOverride(false);
      toast.success("Override removido — tier será recalculado automaticamente.");
      onSuccess({ ...agency, tier_manually_overridden: false });
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar agência</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome da agência</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input value={agency?.email || ""} disabled className="bg-muted" /></div>
          <div>
            <Label>Tier</Label>
            <Select value={tier} onValueChange={v => { setTier(v); setOverride(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="explorer">Explorer</SelectItem><SelectItem value="hack">Hack</SelectItem></SelectContent>
            </Select>
            {override && <p className="text-xs text-yellow-600 mt-1">⚠ Override manual — ignora contagem de clientes</p>}
            {override && <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={handleRemoveOverride}>Remover override</Button>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ CREATE CLIENT MODAL ═══════════════════ */

const CreateClientModal = ({ open, onClose, agencyId, onSuccess }: { open: boolean; onClose: () => void; agencyId: string; onSuccess: () => void }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [createAccess, setCreateAccess] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState(generatePassword());
  const [templates, setTemplates] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => { if (open) loadTemplates(); }, [open]);
  useEffect(() => { setAccessEmail(email); }, [email]);

  const loadTemplates = async () => {
    const { data } = await supabase.from("platform_templates").select("id, name, platform_price_monthly").eq("is_active", true);
    setTemplates((data || []).map(t => ({ id: t.id, name: t.name, price: t.platform_price_monthly })));
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      await adminInvoke({
        action: "create-client",
        agency_id: agencyId,
        client_name: name, client_email: email || null, client_phone: phone || null, client_document: document || null,
        create_access: createAccess, access_email: accessEmail || null, access_password: accessPassword,
        template_ids: selectedTemplates,
      });
      setCreated(true);
      toast.success("Cliente criado!");
      onSuccess();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleClose = () => { setStep(1); setName(""); setEmail(""); setPhone(""); setDocument(""); setCreateAccess(false); setAccessEmail(""); setAccessPassword(generatePassword()); setSelectedTemplates([]); setCreated(false); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{created ? "Cliente criado!" : `Criar cliente — Etapa ${step}/3`}</DialogTitle>
        </DialogHeader>
        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Cliente "{name}" criado com sucesso.</p>
            {createAccess && (
              <div className="rounded-lg border p-3 space-y-1 bg-muted/50">
                <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {accessEmail}</p>
                <p className="text-sm"><span className="text-muted-foreground">Senha:</span> {accessPassword}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(`E-mail: ${accessEmail}\nSenha: ${accessPassword}`); toast.success("Copiado!"); }}>
                  <Copy className="w-4 h-4 mr-1.5" /> Copiar
                </Button>
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div><Label>CPF/CNPJ</Label><Input value={document} onChange={e => setDocument(e.target.value)} /></div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={createAccess} onCheckedChange={setCreateAccess} />
              <Label>Criar acesso ao workspace</Label>
            </div>
            {createAccess && (
              <div className="space-y-3 pl-1">
                <div><Label>E-mail de acesso</Label><Input value={accessEmail} onChange={e => setAccessEmail(e.target.value)} /></div>
                <div>
                  <Label>Senha temporária</Label>
                  <div className="flex gap-2">
                    <Input value={accessPassword} onChange={e => setAccessPassword(e.target.value)} />
                    <Button variant="outline" size="icon" onClick={() => setAccessPassword(generatePassword())}><RefreshCw className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            <p className="text-sm text-muted-foreground">Selecione templates para ativar (opcional):</p>
            {templates.map(t => (
              <label key={t.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
                <Checkbox checked={selectedTemplates.includes(t.id)} onCheckedChange={c => setSelectedTemplates(c ? [...selectedTemplates, t.id] : selectedTemplates.filter(id => id !== t.id))} />
                <span className="text-sm flex-1">{t.name}</span>
                <span className="text-xs text-muted-foreground">R$ {t.price.toFixed(2)}/mês</span>
              </label>
            ))}
            {templates.length === 0 && <p className="text-sm text-muted-foreground">Nenhum template disponível.</p>}
          </div>
        )}
        <DialogFooter>
          {created ? <Button onClick={handleClose}>Fechar</Button> : (
            <>
              <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : handleClose()}>{step > 1 ? "Voltar" : "Cancelar"}</Button>
              {step < 3 ? <Button onClick={() => { if (step === 1 && !name.trim()) { toast.error("Nome obrigatório"); return; } setStep(step + 1); }}>Próximo</Button> :
                <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Criar cliente</Button>}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ EDIT CLIENT MODAL ═══════════════════ */

const EditClientModal = ({ open, onClose, client, onSuccess }: { open: boolean; onClose: () => void; client: ClientRow | null; onSuccess: (c: ClientRow) => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [doc, setDoc] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) { setName(client.client_name); setEmail(client.client_email || ""); setPhone(client.client_phone || ""); setDoc(client.client_document || ""); setStatus(client.status || "active"); }
  }, [client]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await adminInvoke({ action: "update-client", client_id: client.id, client_name: name, client_email: email || null, client_phone: phone || null, client_document: doc || null, status });
      toast.success("Cliente atualizado!");
      onSuccess({ ...client, client_name: name, client_email: email || null, client_phone: phone || null, client_document: doc || null, status });
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div><Label>CPF/CNPJ</Label><Input value={doc} onChange={e => setDoc(e.target.value)} /></div>
          <div className="flex items-center gap-3">
            <Label>Status:</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="suspended">Suspenso</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ CREATE WORKSPACE ACCESS MODAL ═══════════════════ */

const CreateWorkspaceModal = ({ open, onClose, client, onSuccess }: { open: boolean; onClose: () => void; client: ClientRow | null; onSuccess: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => { if (client) setEmail(client.client_email || ""); }, [client]);

  const handleCreate = async () => {
    if (!client || !email) { toast.error("E-mail obrigatório"); return; }
    setSaving(true);
    try {
      await adminInvoke({ action: "create-workspace-access", client_id: client.id, email, password, client_name: client.client_name });
      setCreated(true);
      toast.success("Acesso criado!");
      onSuccess();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleClose = () => { setCreated(false); setEmail(""); setPassword(generatePassword()); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{created ? "Acesso criado!" : "Criar acesso ao workspace"}</DialogTitle></DialogHeader>
        {created ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 space-y-1 bg-muted/50">
              <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {email}</p>
              <p className="text-sm"><span className="text-muted-foreground">Senha:</span> {password}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`E-mail: ${email}\nSenha: ${password}`); toast.success("Copiado!"); }}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <Label>Senha temporária</Label>
              <div className="flex gap-2">
                <Input value={password} onChange={e => setPassword(e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => setPassword(generatePassword())}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {created ? <Button onClick={handleClose}>Fechar</Button> : (
            <><Button variant="outline" onClick={handleClose}>Cancelar</Button><Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Criar acesso</Button></>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ LEVEL 1 — Platform ═══════════════════ */

const Level1 = ({ onSelectAgency, initialTier, initialAgencyId }: { onSelectAgency: (a: AgencyRow) => void; initialTier?: string; initialAgencyId?: string }) => {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(initialTier || "all");
  const [showCreate, setShowCreate] = useState(false);
  const [stats, setStats] = useState({ totalAgencies: 0, totalClients: 0, platformMRR: 0, templatesSold: 0, tierBreakdown: { starter: { agencies: 0, clients: 0, mrr: 0 }, explorer: { agencies: 0, clients: 0, mrr: 0 }, hack: { agencies: 0, clients: 0, mrr: 0 } } });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (initialTier) setTierFilter(initialTier); }, [initialTier]);
  useEffect(() => {
    if (initialAgencyId && agencies.length > 0) {
      const a = agencies.find(ag => ag.id === initialAgencyId);
      if (a) onSelectAgency(a);
    }
  }, [initialAgencyId, agencies]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agenciesRes, subsRes, usersData, clientsRes] = await Promise.all([
        supabase.from("agency_profiles").select("id, user_id, agency_name, logo_url, tier, active_clients_count, asaas_api_key, asaas_wallet_id, created_at, custom_pricing, tier_manually_overridden").then((res: any) => {
          if (res.data) {
            res.data = res.data.map((row: any) => ({
              ...row,
              asaas_api_key: row.asaas_api_key ? "connected" : null,
            }));
          }
          return res;
        }),
        supabase.from("client_template_subscriptions").select("agency_id, agency_price_monthly, platform_price_monthly, status").in("status", ["active", "trial"]),
        supabase.functions.invoke("admin-users", { body: { action: "list" } }),
        supabase.from("agency_clients").select("id, status, agency_id"),
      ]);

      const usersMap = new Map<string, string>();
      (usersData?.data?.users || []).forEach((u: any) => usersMap.set(u.user_id, u.email || ""));

      const mrrMap = new Map<string, number>();
      const platformMap = new Map<string, number>();
      (subsRes.data || []).forEach((s: any) => {
        mrrMap.set(s.agency_id, (mrrMap.get(s.agency_id) || 0) + ((s.agency_price_monthly || 0) - (s.platform_price_monthly || 0)));
        platformMap.set(s.agency_id, (platformMap.get(s.agency_id) || 0) + (s.platform_price_monthly || 0));
      });

      const agenciesData = (agenciesRes.data || []).map(a => ({
        ...a,
        email: usersMap.get(a.user_id) || "",
        mrr: mrrMap.get(a.id) || 0,
        platformRevenue: platformMap.get(a.id) || 0,
      }));
      setAgencies(agenciesData);

      const activeClients = (clientsRes.data || []).filter(c => c.status === "active");
      const activeSubs = subsRes.data || [];
      const platformMRR = activeSubs.reduce((sum: number, s: any) => sum + (s.platform_price_monthly || 0), 0);

      const tb = { starter: { agencies: 0, clients: 0, mrr: 0 }, explorer: { agencies: 0, clients: 0, mrr: 0 }, hack: { agencies: 0, clients: 0, mrr: 0 } };
      agenciesData.forEach(a => { const t = a.tier as keyof typeof tb; if (tb[t]) { tb[t].agencies++; tb[t].clients += a.active_clients_count || 0; } });
      activeSubs.forEach((s: any) => {
        const agTier = agenciesData.find(a => a.id === s.agency_id)?.tier as keyof typeof tb;
        if (agTier && tb[agTier]) tb[agTier].mrr += s.platform_price_monthly || 0;
      });

      setStats({ totalAgencies: agenciesData.length, totalClients: activeClients.length, platformMRR, templatesSold: activeSubs.length, tierBreakdown: tb });
    } catch { toast.error("Erro ao carregar dados"); }
    setLoading(false);
  };

  const filtered = agencies.filter(a => {
    if (search) { const s = search.toLowerCase(); if (!(a.agency_name || "").toLowerCase().includes(s) && !(a.email || "").toLowerCase().includes(s)) return false; }
    if (tierFilter !== "all" && a.tier !== tierFilter) return false;
    return true;
  });

  const tierRows = [
    { key: "starter" as const, label: "Starter", cls: "bg-muted", textCls: "text-muted-foreground" },
    { key: "explorer" as const, label: "Explorer", cls: "bg-blue-500/10", textCls: "text-blue-600" },
    { key: "hack" as const, label: "Hack", cls: "bg-purple-500/10", textCls: "text-purple-600" },
  ];

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, iconCls: "bg-blue-500/10 text-blue-600", value: stats.totalAgencies, label: "Agências ativas" },
          { icon: Users, iconCls: "bg-emerald-500/10 text-emerald-600", value: stats.totalClients, label: "Clientes ativos" },
          { icon: DollarSign, iconCls: "bg-primary/10 text-primary", value: `R$ ${stats.platformMRR.toFixed(0)}`, label: "MRR Plataforma" },
          { icon: LayoutTemplate, iconCls: "bg-purple-500/10 text-purple-600", value: stats.templatesSold, label: "Templates vendidos" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.iconCls.split(" ")[0]}`}>
                <s.icon className={`h-5 w-5 ${s.iconCls.split(" ")[1]}`} />
              </div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tier breakdown */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Distribuição por tier</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {tierRows.map(t => {
              const data = stats.tierBreakdown[t.key];
              return (
                <div key={t.key} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setTierFilter(tierFilter === t.key ? "all" : t.key)}>
                  <div className="flex items-center gap-3">
                    <Badge className={`${t.cls} ${t.textCls} border-0 text-xs min-w-[70px] justify-center`}>{t.label}</Badge>
                    <span className="text-sm font-medium">{data.agencies} agência(s)</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{data.clients} clientes</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-primary">R$ {data.mrr.toFixed(0)} MRR</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agencies table */}
      <div className="space-y-3">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar agência..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os tiers</SelectItem><SelectItem value="starter">Starter</SelectItem><SelectItem value="explorer">Explorer</SelectItem><SelectItem value="hack">Hack</SelectItem></SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1.5" /> Atualizar</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Criar agência</Button>
        </div>

        <div className="text-xs text-muted-foreground">{filtered.length} agência(s)</div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agência</TableHead><TableHead>E-mail</TableHead><TableHead>Tier</TableHead>
                  <TableHead>Clientes</TableHead><TableHead>MRR</TableHead><TableHead>Asaas</TableHead><TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma agência encontrada</TableCell></TableRow>
                ) : filtered.map(a => {
                  const tier = TIER_BADGES[a.tier] || TIER_BADGES.starter;
                  return (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelectAgency(a)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {a.logo_url ? <img src={a.logo_url} alt="" className="w-7 h-7 rounded-full object-cover" /> :
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-muted-foreground" /></div>}
                          <span className="font-medium">{a.agency_name || "Sem nome"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={`${tier.className} border-0 text-xs`}>{tier.label}</Badge>
                          {a.tier_manually_overridden && <Badge variant="outline" className="text-[9px] border-yellow-500 text-yellow-600">Override</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{a.active_clients_count || 0}</TableCell>
                      <TableCell className="font-medium">R$ {((a.mrr || 0) + (a.platformRevenue || 0)).toFixed(2)}</TableCell>
                      <TableCell>
                        {a.asaas_api_key ? <Badge className="bg-green-500/10 text-green-600 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge> :
                          <Badge className="bg-red-500/10 text-red-500 border-0 text-xs"><XCircle className="w-3 h-3 mr-1" />Não config.</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{relativeDate(a.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreateAgencyModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchData} />
    </div>
  );
};

/* ═══════════════════ LEVEL 2 — Agency detail ═══════════════════ */

const Level2 = ({ agency, onSelectClient, onAgencyUpdated }: { agency: AgencyRow; onSelectClient: (c: ClientRow) => void; onAgencyUpdated: (a: AgencyRow) => void }) => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditAgency, setShowEditAgency] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [confirmUserAction, setConfirmUserAction] = useState<{ type: "suspend" | "unsuspend" | "delete" | "reset-password"; user: UserRow } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  useEffect(() => { fetchData(); }, [agency.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, subsRes, templatesRes, usersData] = await Promise.all([
        supabase.from("agency_clients").select("id, client_name, client_email, client_phone, client_document, status, created_at, client_user_id, agency_id").eq("agency_id", agency.id),
        supabase.from("client_template_subscriptions").select("id, client_id, template_id, agency_price_monthly, platform_price_monthly, status, activated_channel, activated_at").eq("agency_id", agency.id),
        supabase.from("platform_templates").select("id, name"),
        supabase.functions.invoke("admin-users", { body: { action: "list" } }),
      ]);

      const templateMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));
      const clientSubsMap = new Map<string, ClientRow["templates"]>();
      const clientMRR = new Map<string, number>();
      const clientPlatform = new Map<string, number>();

      (subsRes.data || []).forEach(s => {
        if (!clientSubsMap.has(s.client_id)) clientSubsMap.set(s.client_id, []);
        clientSubsMap.get(s.client_id)!.push({
          id: s.template_id, name: templateMap.get(s.template_id) || "—",
          agency_price: s.agency_price_monthly || 0, platform_price: s.platform_price_monthly || 0,
          status: s.status || "—", channel: s.activated_channel, activated_at: s.activated_at, subscription_id: s.id,
        });
        if (["active", "trial"].includes(s.status || "")) {
          clientMRR.set(s.client_id, (clientMRR.get(s.client_id) || 0) + (s.agency_price_monthly || 0));
          clientPlatform.set(s.client_id, (clientPlatform.get(s.client_id) || 0) + (s.platform_price_monthly || 0));
        }
      });

      setClients((clientsRes.data || []).map(c => ({
        ...c, templates: clientSubsMap.get(c.id) || [], mrr: clientMRR.get(c.id) || 0, platformRevenue: clientPlatform.get(c.id) || 0,
      })));

      const allUsers: any[] = usersData?.data?.users || [];
      setUsers(allUsers.filter((u: any) => u.agency?.id === agency.id || (u.tenant_type === "agency" && u.user_id === agency.user_id)).map((u: any) => ({
        id: u.id, user_id: u.user_id, email: u.email, full_name: u.full_name,
        role: u.role, tenant_type: u.tenant_type, is_active: u.is_active, last_sign_in_at: u.last_sign_in_at,
      })));
    } catch { toast.error("Erro ao carregar dados da agência"); }
    setLoading(false);
  };

  const handleSuspendAgency = async () => {
    setActionLoading(true);
    try {
      await adminInvoke({ action: "suspend", user_id: agency.user_id });
      // Suspend all clients too
      for (const c of clients) {
        if (c.client_user_id) await adminInvoke({ action: "suspend", user_id: c.client_user_id });
      }
      toast.success("Agência suspensa.");
      setConfirmSuspend(false);
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleDeleteAgency = async () => {
    setActionLoading(true);
    try {
      await adminInvoke({ action: "delete", user_id: agency.user_id });
      toast.success("Agência excluída.");
      setConfirmDelete(false);
      // Will need to go back to Level 1 — parent handles this
      window.location.reload();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const tier = TIER_BADGES[agency.tier] || TIER_BADGES.starter;
  const progress = getTierProgress(agency.tier, agency.active_clients_count || 0);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Agency info card */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {agency.logo_url ? <img src={agency.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><Building2 className="w-5 h-5 text-muted-foreground" /></div>}
                <div>
                  <h2 className="text-lg font-bold">{agency.agency_name || "Sem nome"}</h2>
                  <p className="text-sm text-muted-foreground">{agency.email || "—"}</p>
                </div>
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Asaas:</span> {agency.asaas_api_key ? "Configurado" : "Não configurado"}</p>
              <p className="text-sm text-muted-foreground">Cadastro: {relativeDate(agency.created_at)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Tier</p>
              <div className="flex items-center gap-2">
                <Badge className={`${tier.className} border-0`}>{tier.label}</Badge>
                {agency.tier_manually_overridden && <Badge variant="outline" className="text-[9px] border-yellow-500 text-yellow-600">Override</Badge>}
                <span className="text-sm">{agency.active_clients_count || 0} clientes</span>
              </div>
              <Progress value={progress.pct} className="h-2" />
              {progress.next && <p className="text-xs text-muted-foreground">Faltam {progress.target - (agency.active_clients_count || 0)} para {progress.next}</p>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Financeiro</p>
              <p className="text-sm">MRR Total: <span className="font-bold">R$ {((agency.mrr || 0) + (agency.platformRevenue || 0)).toFixed(2)}</span></p>
              <p className="text-sm">Plataforma: <span className="font-medium text-primary">R$ {(agency.platformRevenue || 0).toFixed(2)}</span></p>
              <p className="text-sm">Lucro Agência: <span className="font-medium">R$ {(agency.mrr || 0).toFixed(2)}</span></p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button size="sm" variant="outline" onClick={() => setShowEditAgency(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" />Editar</Button>
            <Button size="sm" variant="outline" className="text-yellow-600" onClick={() => setConfirmSuspend(true)}><Ban className="w-3.5 h-3.5 mr-1.5" />Suspender</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1.5" />Excluir</Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients table */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Clientes ({clients.length})</h3>
          <Button size="sm" onClick={() => setShowCreateClient(true)}><Plus className="w-4 h-4 mr-1.5" />Criar cliente</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Templates ativos</TableHead><TableHead>MRR</TableHead><TableHead>Status</TableHead><TableHead>Cadastro</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cliente</TableCell></TableRow>
                ) : clients.map(c => {
                  const st = STATUS_MAP[c.status || ""] || STATUS_MAP.inactive;
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelectClient(c)}>
                      <TableCell className="font-medium">{c.client_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.client_email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.templates.filter(t => ["active", "trial"].includes(t.status)).slice(0, 2).map(t => (
                            <Badge key={t.subscription_id} variant="outline" className="text-[10px]">{t.name}</Badge>
                          ))}
                          {c.templates.filter(t => ["active", "trial"].includes(t.status)).length > 2 && <Badge variant="outline" className="text-[10px]">+{c.templates.filter(t => ["active", "trial"].includes(t.status)).length - 2}</Badge>}
                          {c.templates.filter(t => ["active", "trial"].includes(t.status)).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">R$ {c.mrr.toFixed(2)}</TableCell>
                      <TableCell><Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{relativeDate(c.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Agency users */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Usuários da agência ({users.length})</h3>
          <Button size="sm" onClick={() => setShowCreateUser(true)}><Plus className="w-4 h-4 mr-1.5" />Criar usuário</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead><TableHead>Status</TableHead><TableHead>Último acesso</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                ) : users.map(u => {
                  const cfg = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG];
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                      <TableCell>{cfg ? <Badge className={`${cfg.bg} ${cfg.color} border-0 text-xs`}>{cfg.label}</Badge> : <Badge variant="secondary" className="text-xs">{u.role}</Badge>}</TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-0 text-xs">Ativo</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border-0 text-xs">Suspenso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingUser(u)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmUserAction({ type: "reset-password", user: u })}>
                              <RotateCcw className="w-3.5 h-3.5 mr-2" />Resetar senha
                            </DropdownMenuItem>
                            {u.is_active ? (
                              <DropdownMenuItem onClick={() => setConfirmUserAction({ type: "suspend", user: u })} className="text-yellow-600">
                                <Ban className="w-3.5 h-3.5 mr-2" />Suspender
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setConfirmUserAction({ type: "unsuspend", user: u })} className="text-green-600">
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" />Reativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setConfirmUserAction({ type: "delete", user: u })} className="text-destructive">
                              <Trash2 className="w-3.5 h-3.5 mr-2" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <EditAgencyModal open={showEditAgency} onClose={() => setShowEditAgency(false)} agency={agency} onSuccess={(updated) => { setShowEditAgency(false); onAgencyUpdated(updated); }} />
      <CreateClientModal open={showCreateClient} onClose={() => setShowCreateClient(false)} agencyId={agency.id} onSuccess={fetchData} />
      <CreateUserDialog open={showCreateUser} onClose={() => setShowCreateUser(false)} onSuccess={fetchData} context="agency" workspaceOwnerUserId={agency.user_id} />
      <EditUserDialog open={!!editingUser} onClose={() => setEditingUser(null)} onSuccess={fetchData} user={editingUser} />

      {/* User action confirmation */}
      <AlertDialog open={!!confirmUserAction} onOpenChange={(o) => !o && setConfirmUserAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmUserAction?.type === "suspend" && "Suspender usuário?"}
              {confirmUserAction?.type === "unsuspend" && "Reativar usuário?"}
              {confirmUserAction?.type === "delete" && "Excluir usuário?"}
              {confirmUserAction?.type === "reset-password" && "Resetar senha?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmUserAction?.type === "suspend" && `O usuário "${confirmUserAction.user.full_name || confirmUserAction.user.email}" não poderá mais acessar a plataforma.`}
              {confirmUserAction?.type === "unsuspend" && `O usuário "${confirmUserAction.user.full_name || confirmUserAction.user.email}" poderá acessar a plataforma novamente.`}
              {confirmUserAction?.type === "delete" && `O usuário "${confirmUserAction.user.full_name || confirmUserAction.user.email}" será excluído permanentemente. Esta ação é irreversível.`}
              {confirmUserAction?.type === "reset-password" && `Um link de recuperação será gerado para "${confirmUserAction.user.email}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmUserAction) return;
                setUserActionLoading(true);
                try {
                  const { type, user: u } = confirmUserAction;
                  if (type === "suspend") {
                    await adminInvoke({ action: "suspend", user_id: u.user_id });
                    toast.success("Usuário suspenso.");
                  } else if (type === "unsuspend") {
                    await adminInvoke({ action: "unsuspend", user_id: u.user_id });
                    toast.success("Usuário reativado.");
                  } else if (type === "delete") {
                    await adminInvoke({ action: "delete", user_id: u.user_id });
                    toast.success("Usuário excluído.");
                  } else if (type === "reset-password") {
                    const result = await adminInvoke({ action: "reset-password", email: u.email });
                    if (result?.link) {
                      await navigator.clipboard.writeText(result.link);
                      toast.success("Link de recuperação copiado!");
                    } else {
                      toast.success("E-mail de recuperação enviado.");
                    }
                  }
                  setConfirmUserAction(null);
                  fetchData();
                } catch (err: any) { toast.error(err.message); }
                setUserActionLoading(false);
              }}
              disabled={userActionLoading}
              className={confirmUserAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : confirmUserAction?.type === "suspend" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
            >
              {userActionLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {confirmUserAction?.type === "suspend" && "Suspender"}
              {confirmUserAction?.type === "unsuspend" && "Reativar"}
              {confirmUserAction?.type === "delete" && "Excluir"}
              {confirmUserAction?.type === "reset-password" && "Resetar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender agência?</AlertDialogTitle>
            <AlertDialogDescription>Isso vai suspender {clients.length} cliente(s) também. O acesso ao workspace será bloqueado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspendAgency} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700">
              {actionLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agência?</AlertDialogTitle>
            <AlertDialogDescription>Isso vai excluir {clients.length} cliente(s) e todas as assinaturas. Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgency} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ═══════════════════ LEVEL 3 — Client detail ═══════════════════ */

const Level3 = ({ agency, client, onSelectSubscription, onGoToAgency, onClientUpdated }: { agency: AgencyRow; client: ClientRow; onSelectSubscription: (s: SubscriptionDetail) => void; onGoToAgency: () => void; onClientUpdated: (c: ClientRow) => void }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    supabase.from("billing_events").select("id, event_type, amount, platform_amount, description, created_at, asaas_payment_id, subscription_id").eq("client_id", client.id).order("created_at", { ascending: false }).limit(20)
      .then(res => { setPayments(res.data || []); setLoading(false); });
  }, [client.id]);

  const st = STATUS_MAP[client.status || ""] || STATUS_MAP.inactive;

  const handleSelectTemplate = async (t: ClientRow["templates"][0]) => {
    const res = await supabase.from("billing_events").select("id, created_at, amount, platform_amount, event_type, asaas_payment_id").eq("subscription_id", t.subscription_id).order("created_at", { ascending: false }).limit(20);
    onSelectSubscription({
      id: t.subscription_id, template_name: t.name, category: "—",
      agency_price: t.agency_price, platform_price: t.platform_price,
      agency_profit: t.agency_price - t.platform_price, status: t.status,
      channel: t.channel, activated_at: t.activated_at, created_at: null,
      payments: (res.data || []).map(p => ({ id: p.id, created_at: p.created_at, amount: p.amount || 0, platform_amount: p.platform_amount || 0, status: p.event_type, asaas_id: p.asaas_payment_id })),
    });
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await adminInvoke({ action: "update-client", client_id: client.id, status: "suspended" });
      if (client.client_user_id) await adminInvoke({ action: "suspend", user_id: client.client_user_id });
      toast.success("Cliente suspenso.");
      setConfirmSuspend(false);
      onClientUpdated({ ...client, status: "suspended" });
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await adminInvoke({ action: "delete-client", client_id: client.id });
      toast.success("Cliente excluído.");
      setConfirmDelete(false);
      onGoToAgency();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">{client.client_name}</h2>
              <p className="text-sm"><span className="text-muted-foreground">E-mail:</span> {client.client_email || "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Telefone:</span> {client.client_phone || "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Documento:</span> {client.client_document || "—"}</p>
              <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Agência:</span>{" "}
                <span className="text-blue-600 hover:underline cursor-pointer" onClick={onGoToAgency}>{agency.agency_name || "—"}</span>
              </p>
              <p className="text-sm"><span className="text-muted-foreground">MRR:</span> <span className="font-bold">R$ {client.mrr.toFixed(2)}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Receita plataforma:</span> <span className="font-medium text-primary">R$ {client.platformRevenue.toFixed(2)}</span></p>
              <p className="text-sm text-muted-foreground">Cadastro: {relativeDate(client.created_at)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" />Editar</Button>
            <Button size="sm" variant="outline" className="text-yellow-600" onClick={() => setConfirmSuspend(true)}><Ban className="w-3.5 h-3.5 mr-1.5" />Suspender</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1.5" />Excluir</Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Templates ({client.templates.length})</h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Template</TableHead><TableHead>Preço agência</TableHead><TableHead>Receita plataforma</TableHead><TableHead>Status</TableHead><TableHead>Canal</TableHead><TableHead>Ativado em</TableHead></TableRow></TableHeader>
              <TableBody>
                {client.templates.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum template</TableCell></TableRow>
                ) : client.templates.map(t => {
                  const tSt = STATUS_MAP[t.status] || STATUS_MAP.inactive;
                  return (
                    <TableRow key={t.subscription_id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleSelectTemplate(t)}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>R$ {t.agency_price.toFixed(2)}</TableCell>
                      <TableCell className="text-primary font-medium">R$ {t.platform_price.toFixed(2)}</TableCell>
                      <TableCell><Badge className={`${tSt.cls} border-0 text-xs`}>{tSt.label}</Badge></TableCell>
                      <TableCell className="text-sm">{t.channel || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{relativeDate(t.activated_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Workspace access */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-2">Acesso ao workspace</h3>
          {client.client_user_id ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm">Usuário vinculado: <span className="font-medium">{client.client_user_id.slice(0, 8)}...</span></p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sem acesso ao workspace</p>
              <Button size="sm" variant="outline" onClick={() => setShowWorkspace(true)}><KeyRound className="w-3.5 h-3.5 mr-1.5" />Criar acesso</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Histórico de pagamentos</h3>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Plataforma</TableHead><TableHead>Descrição</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell><Badge className={`${(STATUS_MAP[p.event_type] || { cls: "bg-muted text-muted-foreground" }).cls} border-0 text-xs`}>{p.event_type}</Badge></TableCell>
                      <TableCell className="font-medium">R$ {(p.amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-primary">R$ {(p.platform_amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <EditClientModal open={showEdit} onClose={() => setShowEdit(false)} client={client} onSuccess={(c) => { setShowEdit(false); onClientUpdated(c); }} />
      <CreateWorkspaceModal open={showWorkspace} onClose={() => setShowWorkspace(false)} client={client} onSuccess={() => { setShowWorkspace(false); onClientUpdated({ ...client, client_user_id: "created" }); }} />

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Suspender cliente?</AlertDialogTitle><AlertDialogDescription>Todas as assinaturas ativas serão suspensas.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700">{actionLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Suspender</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir cliente?</AlertDialogTitle><AlertDialogDescription>Todas as assinaturas e dados serão removidos permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">{actionLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ═══════════════════ LEVEL 4 — Subscription detail ═══════════════════ */

const Level4 = ({ subscription }: { subscription: SubscriptionDetail }) => {
  const st = STATUS_MAP[subscription.status] || STATUS_MAP.inactive;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">{subscription.template_name}</h2>
              <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
              <p className="text-sm"><span className="text-muted-foreground">Canal:</span> {subscription.channel || "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Ativado em:</span> {relativeDate(subscription.activated_at)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Financeiro</p>
              <p className="text-sm">Preço agência: <span className="font-bold">R$ {subscription.agency_price.toFixed(2)}</span></p>
              <p className="text-sm">Receita plataforma: <span className="font-medium text-primary">R$ {subscription.platform_price.toFixed(2)}</span></p>
              <p className="text-sm">Lucro agência: <span className="font-medium">R$ {subscription.agency_profit.toFixed(2)}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3">Histórico de pagamentos</h3>
        {subscription.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Receita plataforma</TableHead><TableHead>Status</TableHead><TableHead>Asaas ID</TableHead></TableRow></TableHeader>
                <TableBody>
                  {subscription.payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="font-medium">R$ {p.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-primary">R$ {p.platform_amount.toFixed(2)}</TableCell>
                      <TableCell><Badge className={`${(STATUS_MAP[p.status] || { cls: "bg-muted text-muted-foreground" }).cls} border-0 text-xs`}>{p.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.asaas_id ? p.asaas_id.slice(0, 12) + "..." : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminGestaoTab;
