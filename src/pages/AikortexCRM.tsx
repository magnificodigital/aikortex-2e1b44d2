import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Search, LayoutGrid, List, Flame, Snowflake, MessageSquare, FileText as NoteIcon, Calendar as CalIcon, Wrench, Mail } from "lucide-react";
import { useCrmContacts, useCrmStages, useCrmContact, useCrmInteractions, useUpdateContact, useAddNote, type CrmContact } from "@/hooks/use-crm";

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

function LeadDetail({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const { data: contact } = useCrmContact(contactId);
  const { data: stages } = useCrmStages();
  const { data: interactions } = useCrmInteractions(contactId);
  const updateContact = useUpdateContact();
  const addNote = useAddNote();
  const [noteDraft, setNoteDraft] = useState("");

  if (!contact) return null;

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
              <Select
                value={contact.stage_slug}
                onValueChange={(v) => updateContact.mutate({ id: contact.id, patch: { stage_slug: v } })}
              >
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages?.map((s) => (
                    <SelectItem key={s.id} value={s.slug} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-muted-foreground">Email</dt><dd className="text-foreground">{contact.email || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Telefone</dt><dd className="text-foreground">{contact.phone || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Última interação</dt><dd className="text-foreground">{formatRelativeTime(contact.last_interaction_at)}</dd></div>
              <div><dt className="text-muted-foreground">Próxima ação</dt><dd className="text-foreground">{contact.next_action_text || "—"}</dd></div>
            </dl>
          </Card>

          {/* Qualificação */}
          {(contact.budget || contact.authority || contact.need || contact.timeline) && (
            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-semibold">Qualificação (BANT)</h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {contact.budget && <div><dt className="text-muted-foreground">Budget</dt><dd>{contact.budget}</dd></div>}
                {contact.authority && <div><dt className="text-muted-foreground">Autoridade</dt><dd>{contact.authority}</dd></div>}
                {contact.need && <div><dt className="text-muted-foreground">Necessidade</dt><dd>{contact.need}</dd></div>}
                {contact.timeline && <div><dt className="text-muted-foreground">Timeline</dt><dd>{contact.timeline}</dd></div>}
              </dl>
            </Card>
          )}

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
              onClick={() => {
                addNote.mutate(
                  { contactId: contact.id, content: noteDraft.trim() },
                  { onSuccess: () => setNoteDraft("") },
                );
              }}
            >
              Salvar nota
            </Button>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map(({ stage, cards }) => (
        <div
          key={stage.id}
          className="min-w-[260px] flex-1 rounded-lg bg-muted/30 p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const cid = e.dataTransfer.getData("text/plain");
            if (cid) updateContact.mutate({ id: cid, patch: { stage_slug: stage.slug } });
          }}
        >
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
              <span className="text-xs font-semibold">{stage.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{cards.length}</span>
          </div>
          <div className="space-y-1.5">
            {cards.map((c) => (
              <Card
                key={c.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                onClick={() => onSelect(c.id)}
                className="p-2.5 cursor-pointer hover:border-primary/50 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{c.name || "Sem nome"}</p>
                  <TemperatureBadge temp={c.temperature} />
                </div>
                {c.company && <p className="text-[10px] text-muted-foreground truncate">{c.company}</p>}
                <p className="text-[10px] text-muted-foreground">{formatRelativeTime(c.last_interaction_at)}</p>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AikortexCRM() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");

  const { data: stages = [] } = useCrmStages();
  const { data: contacts = [], isLoading } = useCrmContacts();

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const stats = useMemo(() => {
    const totalActive = contacts.filter((c) => !stages.find((s) => s.slug === c.stage_slug)?.is_won && !stages.find((s) => s.slug === c.stage_slug)?.is_lost).length;
    const won = contacts.filter((c) => stages.find((s) => s.slug === c.stage_slug)?.is_won).length;
    const lost = contacts.filter((c) => stages.find((s) => s.slug === c.stage_slug)?.is_lost).length;
    const conversion = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    return { totalActive, won, lost, conversion };
  }, [contacts, stages]);

  return (
    <DashboardLayout>
      <ModuleGate moduleKey="gestao.crm">
        <div className="p-6 lg:p-8 max-w-7xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CRM</h1>
              <p className="text-sm text-muted-foreground">Leads e contatos que seus agentes capturaram.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">Em andamento</p><p className="text-2xl font-bold">{stats.totalActive}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Ganhos</p><p className="text-2xl font-bold text-emerald-500">{stats.won}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Perdidos</p><p className="text-2xl font-bold text-red-500">{stats.lost}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Conversão</p><p className="text-2xl font-bold">{stats.conversion}%</p></Card>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
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
              <p className="text-sm font-medium">Nenhum contato ainda</p>
              <p className="text-xs text-muted-foreground">
                Quando seus agentes qualificarem leads, eles aparecem aqui automaticamente.
              </p>
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
        </div>
      </ModuleGate>
    </DashboardLayout>
  );
}
