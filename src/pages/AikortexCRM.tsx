import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Search, LayoutGrid, List, Flame, Snowflake, MessageSquare, FileText as NoteIcon, Calendar as CalIcon, Wrench, Mail, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import {
  useCrmContacts, useCrmStages, useCrmContact, useCrmInteractions,
  useUpdateContact, useAddNote, useCreateContact, useDeleteContact, useAgencyAgents,
  useHubSpotSyncConfig, useHubSpotPushContact,
  type CrmContact,
} from "@/hooks/use-crm";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

function TemperatureBadge({ temp }: { temp: CrmContact["temperature"] }) {
  if (!temp) return <span className="text-muted-foreground text-xs">—</span>;
  const config = {
    hot: { label: "Quente", icon: Flame, cls: "bg-red-500/10 text-red-600 border-red-500/30" },
    warm: { label: "Morno", icon: Flame, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    cold: { label: "Frio", icon: Snowflake, cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  }[temp];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] ${config.cls}`}>
      <Icon className="w-3 h-3" /> {config.label}
    </Badge>
  );
}

function StageBadge({ slug, stages }: { slug: string; stages: ReturnType<typeof useCrmStages>["data"] }) {
  const stage = stages?.find((s) => s.slug === slug);
  if (!stage) return <Badge variant="outline" className="text-[10px]">{slug}</Badge>;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border"
      style={{ borderColor: stage.color, color: stage.color, background: `${stage.color}15` }}
    >
      {stage.name}
    </span>
  );
}

const INTERACTION_ICONS: Record<string, typeof MessageSquare> = {
  message_in: MessageSquare,
  message_out: MessageSquare,
  tool_called: Wrench,
  stage_changed: LayoutGrid,
  note: NoteIcon,
  email_sent: Mail,
  calendar_created: CalIcon,
};

// ──────────────────────────────────────────────────────────────────────────
// Dialog: Novo contato
// ──────────────────────────────────────────────────────────────────────────

function NewContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: stages = [] } = useCrmStages();
  const createContact = useCreateContact();
  const [form, setForm] = useState<Partial<CrmContact>>({ stage_slug: "new" });

  const reset = () => setForm({ stage_slug: "new" });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maria Costa" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@empresa.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Telefone</label>
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11 99999-0000" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Empresa</label>
            <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cargo</label>
            <Input value={form.role ?? ""} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Stage</label>
            <Select value={form.stage_slug} onValueChange={(v) => setForm({ ...form, stage_slug: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => <SelectItem key={s.id} value={s.slug} className="text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Temperatura</label>
            <Select value={form.temperature ?? ""} onValueChange={(v) => setForm({ ...form, temperature: v as CrmContact["temperature"] })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Quente</SelectItem>
                <SelectItem value="warm">Morno</SelectItem>
                <SelectItem value="cold">Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Notas</label>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button
            disabled={!form.name?.trim() || createContact.isPending}
            onClick={() => createContact.mutate(form, { onSuccess: () => { reset(); onOpenChange(false); } })}
          >Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// HubSpot Sync card (no Detail)
// ──────────────────────────────────────────────────────────────────────────

function HubSpotSyncCard({ contact }: { contact: CrmContact }) {
  const { data: syncConfig } = useHubSpotSyncConfig();
  const pushContact = useHubSpotPushContact();

  const ids = contact.external_ids ?? {};
  const hsContactId = ids.hubspot_contact_id;
  const hsDealId = ids.hubspot_deal_id;

  if (!syncConfig?.enabled) {
    return (
      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold">HubSpot</h3>
        <p className="text-xs text-muted-foreground">
          Sync com HubSpot não está ativado. Configure em <strong>Configurações → Conectores → HubSpot Sync</strong>.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">HubSpot</h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={pushContact.isPending}
          onClick={() => pushContact.mutate(contact.id)}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${pushContact.isPending ? "animate-spin" : ""}`} />
          {hsContactId ? "Re-sincronizar" : "Sincronizar agora"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Contato HubSpot</p>
          {hsContactId ? (
            <a
              href={`https://app.hubspot.com/contacts/_/contact/${hsContactId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {hsContactId} <ExternalLink className="w-3 h-3" />
            </a>
          ) : <span className="text-muted-foreground">Não sincronizado</span>}
        </div>
        <div>
          <p className="text-muted-foreground">Deal HubSpot</p>
          {hsDealId ? (
            <a
              href={`https://app.hubspot.com/contacts/_/deal/${hsDealId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {hsDealId} <ExternalLink className="w-3 h-3" />
            </a>
          ) : <span className="text-muted-foreground">Sem deal</span>}
        </div>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Lead Detail Sheet (editável)
// ──────────────────────────────────────────────────────────────────────────

function LeadDetail({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const { data: contact } = useCrmContact(contactId);
  const { data: stages } = useCrmStages();
  const { data: interactions } = useCrmInteractions(contactId);
  const updateContact = useUpdateContact();
  const addNote = useAddNote();
  const deleteContact = useDeleteContact();
  const [noteDraft, setNoteDraft] = useState("");

  if (!contact) return null;

  const patch = (p: Partial<CrmContact>) => updateContact.mutate({ id: contact.id, patch: p });

  return (
    <Sheet open={!!contactId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-lg flex items-center gap-2">
            {contact.name || "Sem nome"}
            <TemperatureBadge temp={contact.temperature} />
          </SheetTitle>
          <SheetDescription className="text-xs">
            {contact.company || "Sem empresa"} {contact.role ? `· ${contact.role}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-6">
          {/* Identidade + stage */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Identidade</h3>
              <div className="flex items-center gap-2">
                <Select value={contact.stage_slug} onValueChange={(v) => patch({ stage_slug: v })}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages?.map((s) => <SelectItem key={s.id} value={s.slug} className="text-xs">{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={contact.temperature ?? "none"} onValueChange={(v) => patch({ temperature: v === "none" ? null : v as CrmContact["temperature"] })}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Temp.</SelectItem>
                    <SelectItem value="hot">Quente</SelectItem>
                    <SelectItem value="warm">Morno</SelectItem>
                    <SelectItem value="cold">Frio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { k: "name", label: "Nome" },
                { k: "email", label: "Email" },
                { k: "phone", label: "Telefone" },
                { k: "company", label: "Empresa" },
                { k: "role", label: "Cargo" },
              ].map((f) => (
                <div key={f.k} className="space-y-1">
                  <label className="text-muted-foreground">{f.label}</label>
                  <Input
                    className="h-7 text-xs"
                    value={(contact as any)[f.k] ?? ""}
                    onChange={(e) => patch({ [f.k]: e.target.value || null } as any)}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-muted-foreground">Última interação</label>
                <p className="text-foreground py-1">{formatRelativeTime(contact.last_interaction_at)}</p>
              </div>
            </div>
          </Card>

          {/* Qualificação BANT — editável */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">Qualificação (BANT)</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { k: "budget", label: "Budget" },
                { k: "authority", label: "Autoridade" },
                { k: "need", label: "Necessidade" },
                { k: "timeline", label: "Timeline" },
              ].map((f) => (
                <div key={f.k} className="space-y-1">
                  <label className="text-muted-foreground">{f.label}</label>
                  <Input
                    className="h-7 text-xs"
                    placeholder="—"
                    value={(contact as any)[f.k] ?? ""}
                    onChange={(e) => patch({ [f.k]: e.target.value || null } as any)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Adicionar nota */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold">Adicionar nota</h3>
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Anote algo sobre essa conversa..."
              rows={2}
              className="text-sm"
            />
            <Button
              size="sm"
              disabled={!noteDraft.trim() || addNote.isPending}
              onClick={() => addNote.mutate(
                { contactId: contact.id, content: noteDraft.trim() },
                { onSuccess: () => setNoteDraft("") },
              )}
            >Salvar nota</Button>
          </Card>

          {/* Timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Timeline ({interactions?.length ?? 0})</h3>
            {interactions && interactions.length > 0 ? (
              <ul className="space-y-2">
                {interactions.map((iv) => {
                  const Icon = INTERACTION_ICONS[iv.type] ?? MessageSquare;
                  return (
                    <li key={iv.id} className="flex gap-3 text-xs">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{iv.type.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground">{formatRelativeTime(iv.created_at)}</span>
                        </div>
                        {iv.content && <p className="text-muted-foreground mt-0.5 break-words">{iv.content}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Sem interações registradas ainda.</p>
            )}
          </div>

          {/* HubSpot Sync */}
          <HubSpotSyncCard contact={contact} />

          {/* Danger zone */}
          <div className="pt-4 border-t border-border/40">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (confirm(`Deletar ${contact.name || "esse contato"}? Essa ação não pode ser desfeita.`)) {
                  deleteContact.mutate(contact.id, { onSuccess: onClose });
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Deletar contato
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Kanban
// ──────────────────────────────────────────────────────────────────────────

function KanbanView({ contacts, stages, onSelect }: {
  contacts: CrmContact[];
  stages: NonNullable<ReturnType<typeof useCrmStages>["data"]>;
  onSelect: (id: string) => void;
}) {
  const updateContact = useUpdateContact();
  const columns = useMemo(() => stages.map((s) => ({
    stage: s,
    cards: contacts.filter((c) => c.stage_slug === s.slug),
  })), [stages, contacts]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
      {columns.map(({ stage, cards }) => (
        <div
          key={stage.id}
          className="min-w-[220px] w-[220px] shrink-0 snap-start rounded-lg bg-muted/30 p-2 border border-border/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const cid = e.dataTransfer.getData("text/plain");
            if (cid) updateContact.mutate({ id: cid, patch: { stage_slug: stage.slug } });
          }}
        >
          <div className="flex items-center justify-between px-1.5 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
              <span className="text-xs font-semibold truncate">{stage.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{cards.length}</span>
          </div>
          <div className="space-y-1.5">
            {cards.map((c) => (
              <Card
                key={c.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                onClick={() => onSelect(c.id)}
                className="p-2 cursor-pointer hover:border-primary/50 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{c.name || "Sem nome"}</p>
                  <TemperatureBadge temp={c.temperature} />
                </div>
                {c.company && <p className="text-[10px] text-muted-foreground truncate">{c.company}</p>}
                <p className="text-[10px] text-muted-foreground">{formatRelativeTime(c.last_interaction_at)}</p>
              </Card>
            ))}
            {cards.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 text-center py-3 italic">vazio</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────

export default function AikortexCRM() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [filterTemp, setFilterTemp] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");

  const { data: stages = [] } = useCrmStages();
  const { data: contacts = [], isLoading } = useCrmContacts();
  const { data: agents = [] } = useAgencyAgents();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && !(c.name ?? "").toLowerCase().includes(q) && !(c.email ?? "").toLowerCase().includes(q) && !(c.company ?? "").toLowerCase().includes(q)) return false;
      if (filterTemp !== "all" && c.temperature !== filterTemp) return false;
      if (filterAgent !== "all" && c.primary_agent_id !== filterAgent) return false;
      return true;
    });
  }, [contacts, search, filterTemp, filterAgent]);

  const stats = useMemo(() => {
    const wonStages = new Set(stages.filter((s) => s.is_won).map((s) => s.slug));
    const lostStages = new Set(stages.filter((s) => s.is_lost).map((s) => s.slug));
    const won = contacts.filter((c) => wonStages.has(c.stage_slug)).length;
    const lost = contacts.filter((c) => lostStages.has(c.stage_slug)).length;
    const totalActive = contacts.length - won - lost;
    const conversion = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    return { totalActive, won, lost, conversion };
  }, [contacts, stages]);

  const hasFilters = !!search.trim() || filterTemp !== "all" || filterAgent !== "all";

  return (
    <DashboardLayout>
      <ModuleGate moduleKey="gestao.crm">
        <div className="p-6 lg:p-8 max-w-7xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users2 className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground">CRM</h1>
                <p className="text-sm text-muted-foreground truncate">Leads e contatos que seus agentes capturaram.</p>
              </div>
            </div>
            <Button onClick={() => setNewDialogOpen(true)} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Novo contato
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">Em andamento</p><p className="text-2xl font-bold">{stats.totalActive}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Ganhos</p><p className="text-2xl font-bold text-emerald-500">{stats.won}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Perdidos</p><p className="text-2xl font-bold text-red-500">{stats.lost}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Conversão</p><p className="text-2xl font-bold">{stats.conversion}%</p></Card>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterTemp} onValueChange={setFilterTemp}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todas temps.</SelectItem>
                <SelectItem value="hot" className="text-xs">Quente</SelectItem>
                <SelectItem value="warm" className="text-xs">Morno</SelectItem>
                <SelectItem value="cold" className="text-xs">Frio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos agentes</SelectItem>
                {agents.map((a) => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban")}>
              <TabsList className="h-9">
                <TabsTrigger value="list" className="gap-1.5 text-xs"><List className="w-3.5 h-3.5" /> Lista</TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5 text-xs"><LayoutGrid className="w-3.5 h-3.5" /> Pipeline</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conteúdo */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center space-y-2">
              <Users2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">{hasFilters ? "Nenhum contato com esses filtros" : "Nenhum contato ainda"}</p>
              <p className="text-xs text-muted-foreground">
                {hasFilters
                  ? "Tente afrouxar os filtros ou criar um novo contato."
                  : "Quando seus agentes qualificarem leads, eles aparecem aqui automaticamente."}
              </p>
              <Button size="sm" variant="outline" className="gap-1.5 mt-2" onClick={() => setNewDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Adicionar manualmente
              </Button>
            </Card>
          ) : view === "list" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Temp.</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Última interação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedId(c.id)}>
                      <TableCell className="font-medium text-sm">{c.name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.company || "—"}</TableCell>
                      <TableCell><StageBadge slug={c.stage_slug} stages={stages} /></TableCell>
                      <TableCell><TemperatureBadge temp={c.temperature} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatRelativeTime(c.last_interaction_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <KanbanView contacts={filtered} stages={stages} onSelect={setSelectedId} />
          )}

          <LeadDetail contactId={selectedId} onClose={() => setSelectedId(null)} />
          <NewContactDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
        </div>
      </ModuleGate>
    </DashboardLayout>
  );
}
