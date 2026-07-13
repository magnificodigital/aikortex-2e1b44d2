import { useState } from "react";
import { Mail, Phone, MapPin, Globe, Clock, Calendar, Building, Copy, MessageSquare, Flame, ArrowUpRight, X, Plus, Sparkles, Loader2, Send, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface ContactInfo {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  localTime?: string;
  language?: string;
  firstContact?: string;
  labels?: { name: string; color: string }[];
  customAttributes?: { label: string; value: string }[];
  socialLinks?: { platform: string; url: string }[];
  previousConversations?: number;
  /** Lead do CRM vinculado a esta conversa (criado automatico no 1o contato). */
  crm?: {
    stage?: string | null;
    temperature?: string | null;
    company?: string | null;
  } | null;
}

const TEMP_LABEL: Record<string, { label: string; className: string }> = {
  hot:  { label: "Quente", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  warm: { label: "Morno",  className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  cold: { label: "Frio",   className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
};

interface ContactPanelProps {
  contact: ContactInfo | null;
  /** Etiquetas da conversa (conversations.tags) + editor. */
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  /** Contexto da conversa pro Copilot (Stark) — ultimas mensagens em texto. */
  copilotContext?: string;
  /** Infos da conversa (acordeao "Informações da conversa"). */
  conversationInfo?: { channel: string; createdAt: string | null; status: string };
  /** Salva campos do contato/lead editados pelo atendente. */
  onSaveContact?: (patch: { name?: string; email?: string; company?: string }) => void;
  /** Acoes da conversa (acordeao, espelha o header — referencia Chatwoot). */
  actions?: {
    status: string;
    aiEnabled: boolean;
    muted: boolean;
    onToggleResolve: () => void;
    onToggleAi: () => void;
    onToggleMute: () => void;
  };
}

const ContactPanel = ({ contact, tags = [], onTagsChange, copilotContext, conversationInfo, onSaveContact, actions }: ContactPanelProps) => {
  const [tab, setTab] = useState<"contact" | "copilot">("contact");
  // Coluna sempre presente — placeholder quando nada selecionado, pra
  // estrutura da tela nao "sumir" no estado vazio.
  if (!contact) {
    return (
      <div className="w-[300px] min-w-[260px] border-l border-border bg-card flex flex-col h-full">
        <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            Os dados do contato e o lead do CRM aparecem aqui ao selecionar uma conversa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] min-w-[260px] border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Tabs Contato | Copilot (clone Chatwoot — Copilot = Stark) */}
      <div className="h-14 shrink-0 px-3 flex items-center border-b border-border">
        <div className="flex w-full bg-muted/50 rounded-lg p-0.5">
          <button
            onClick={() => setTab("contact")}
            className={cn(
              "flex-1 h-8 rounded-md text-xs font-medium transition",
              tab === "contact" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Contato
          </button>
          <button
            onClick={() => setTab("copilot")}
            className={cn(
              "flex-1 h-8 rounded-md text-xs font-medium transition flex items-center justify-center gap-1",
              tab === "copilot" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="w-3 h-3" /> Copilot
          </button>
        </div>
      </div>

      {tab === "copilot" ? (
        <CopilotTab context={copilotContext} />
      ) : (
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center space-y-2">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-base font-semibold bg-muted text-muted-foreground">
                    {contact.initials.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <NameEditor name={contact.name} onSave={onSaveContact ? (v) => onSaveContact({ name: v }) : undefined} />
                  {contact.company && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{contact.company}</p>
                  )}
                </div>
              </div>

              {/* Secoes acordeao (estilo Chatwoot) */}
              <Accordion type="multiple" defaultValue={["actions", "info", "crm"]} className="w-full">
                {actions && (
                  <AccordionItem value="actions">
                    <AccordionTrigger className="text-xs font-semibold py-2.5">Ações da conversa</AccordionTrigger>
                    <AccordionContent className="space-y-1.5 pb-3">
                      <Button variant="outline" size="sm" className="w-full h-7 text-[11px] justify-start gap-2" onClick={actions.onToggleResolve}>
                        {actions.status === "resolved" ? "Reabrir conversa" : "Marcar como resolvida"}
                      </Button>
                      <Button variant="outline" size="sm" className="w-full h-7 text-[11px] justify-start gap-2" onClick={actions.onToggleAi}>
                        {actions.aiEnabled ? "Assumir conversa (pausar IA)" : "Devolver pro agente de IA"}
                      </Button>
                      <Button variant="outline" size="sm" className="w-full h-7 text-[11px] justify-start gap-2" onClick={actions.onToggleMute}>
                        {actions.muted ? "Reativar notificações" : "Silenciar conversa"}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                )}
                <AccordionItem value="info">
                  <AccordionTrigger className="text-xs font-semibold py-2.5">Informações do contato</AccordionTrigger>
                  <AccordionContent className="space-y-2.5 pb-3">
                    <EditableRow icon={Mail} label="Email" value={contact.email}
                      onSave={onSaveContact ? (v) => onSaveContact({ email: v }) : undefined} />
                    <InfoRow icon={Phone} label="Telefone" value={contact.phone} copyable />
                    <EditableRow icon={Building} label="Empresa" value={contact.company || "—"}
                      onSave={onSaveContact ? (v) => onSaveContact({ company: v }) : undefined} />
                    {contact.location && <InfoRow icon={MapPin} label="Localização" value={contact.location} />}
                    {contact.language && <InfoRow icon={Globe} label="Idioma" value={contact.language} />}
                    {contact.localTime && <InfoRow icon={Clock} label="Hora Local" value={contact.localTime} />}
                    {contact.firstContact && <InfoRow icon={Calendar} label="Primeiro Contato" value={contact.firstContact} />}
                  </AccordionContent>
                </AccordionItem>

                {contact.crm && (
                  <AccordionItem value="crm">
                    <AccordionTrigger className="text-xs font-semibold py-2.5">Lead no CRM</AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {contact.crm.stage && (
                          <Badge variant="outline" className="text-[10px] h-5">{contact.crm.stage}</Badge>
                        )}
                        {contact.crm.temperature && TEMP_LABEL[contact.crm.temperature] && (
                          <Badge variant="outline" className={cn("text-[10px] h-5 gap-1", TEMP_LABEL[contact.crm.temperature].className)}>
                            <Flame className="w-2.5 h-2.5" />
                            {TEMP_LABEL[contact.crm.temperature].label}
                          </Badge>
                        )}
                      </div>
                      <Button asChild variant="outline" size="sm" className="w-full h-7 text-[11px] gap-1">
                        <Link to="/aikortex/crm">
                          Ver no CRM <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {onTagsChange && (
                  <AccordionItem value="tags">
                    <AccordionTrigger className="text-xs font-semibold py-2.5">Etiquetas</AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <TagsEditor tags={tags} onChange={onTagsChange} />
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>

              {/* Social Links */}
              {contact.socialLinks && contact.socialLinks.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Redes Sociais</p>
                    <div className="flex items-center gap-2">
                      {contact.socialLinks.map((s) => (
                        <Button key={s.platform} variant="outline" size="icon" className="h-7 w-7">
                          <Globe className="w-3 h-3" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Labels */}
              {contact.labels && contact.labels.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Labels</p>
                    <div className="flex flex-wrap gap-1.5">
                      {contact.labels.map((l) => (
                        <Badge key={l.name} variant="outline" className="text-[10px] h-5 gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", l.color)} />
                          {l.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Previous Conversations */}
              {contact.previousConversations !== undefined && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conversas Anteriores</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{contact.previousConversations} conversas</span>
                    </div>
                  </div>
                </>
              )}

              {/* Informações da conversa */}
              {conversationInfo && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Informações da conversa</p>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><span className="capitalize">{conversationInfo.channel}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{conversationInfo.status}</span></div>
                      {conversationInfo.createdAt && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Criada em</span><span>{new Date(conversationInfo.createdAt).toLocaleDateString("pt-BR")}</span></div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
      )}
    </div>
  );
};

/** Copilot = Stark analisando a conversa. Usa a edge stark-chat (mesma do
 *  modo texto do Stark) com o contexto das ultimas mensagens embutido. */
const CopilotTab = ({ context }: { context?: string }) => {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada"); return; }
      const text = context
        ? `${q}\n\n[Contexto — conversa em andamento no inbox]:\n${context}`
        : q;
      const resp = await fetch(fnUrl("stark-chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text, history: [] }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) { toast.error(j?.message || "Copilot indisponível"); return; }
      setThread((prev) => [...prev, { q, a: j.reply || "—" }]);
    } catch {
      toast.error("Sem conexão.");
    } finally {
      setAsking(false);
    }
  };

  const SUGGESTIONS = [
    "Resuma esta conversa",
    "Qual o próximo passo com esse lead?",
    "O cliente parece satisfeito?",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {thread.length === 0 && (
            <div className="space-y-2 pt-4">
              <p className="text-[11px] text-muted-foreground text-center px-4">
                Pergunte ao Stark sobre esta conversa — ele vê as últimas mensagens.
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuestion(s)}
                  className="w-full text-left text-[11px] px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {thread.map((t, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground bg-accent rounded-lg px-3 py-1.5">{t.q}</p>
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap px-1">{t.a}</p>
            </div>
          ))}
          {asking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
        </div>
      </ScrollArea>
      <div className="p-2.5 border-t border-border flex items-center gap-1.5">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder="Pergunte ao Stark…"
          className="h-8 text-xs"
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={ask} disabled={!question.trim() || asking}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

/** Nome do contato com edicao inline (lapis ao lado). */
const NameEditor = ({ name, onSave }: { name: string; onSave?: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (!onSave) return <h3 className="text-sm font-bold text-foreground">{name}</h3>;
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { setEditing(false); if (draft.trim() && draft.trim() !== name) onSave(draft.trim()); }
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => { setEditing(false); if (draft.trim() && draft.trim() !== name) onSave(draft.trim()); }}
        className="text-sm font-bold bg-muted rounded px-2 py-0.5 outline-none border border-border focus:border-primary/50 text-center w-44"
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <h3 className="text-sm font-bold text-foreground">{name}</h3>
      <Button variant="ghost" size="icon" className="h-5 w-5" title="Editar nome"
        onClick={() => { setDraft(name); setEditing(true); }}>
        <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
      </Button>
    </span>
  );
};

/** Campo do contato editavel pelo atendente: vazio mostra "Adicionar…",
 *  preenchido mostra valor + lapis. Enter/blur salva. */
const EditableRow = ({ icon: Icon, label, value, onSave }: {
  icon: any; label: string; value: string; onSave?: (v: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const empty = !value || value === "—";

  if (!onSave) return <InfoRow icon={Icon} label={label} value={value} copyable={!empty} />;

  const commit = () => {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== value) onSave(v);
  };

  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {editing ? (
          <input
            autoFocus
            defaultValue={empty ? "" : value}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={commit}
            placeholder={`${label}…`}
            className="w-full bg-muted rounded px-1.5 py-0.5 text-[11px] outline-none border border-border focus:border-primary/50"
          />
        ) : empty ? (
          <button
            onClick={() => { setDraft(""); setEditing(true); }}
            className="text-[11px] text-primary/80 hover:text-primary transition"
          >
            + Adicionar {label.toLowerCase()}
          </button>
        ) : (
          <p className="text-[11px] text-foreground truncate">{value}</p>
        )}
      </div>
      {!editing && !empty && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-5 w-5" title={`Editar ${label.toLowerCase()}`}
            onClick={() => { setDraft(value); setEditing(true); }}>
            <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" title={`Copiar ${label.toLowerCase()}`}
            onClick={() => {
              navigator.clipboard.writeText(value)
                .then(() => toast.success(`${label} copiado`))
                .catch(() => toast.error("Não consegui copiar"));
            }}>
            <Copy className="w-2.5 h-2.5 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, copyable }: { icon: any; label: string; value: string; copyable?: boolean }) => {
  const hasValue = value && value !== "—";
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-[11px] text-foreground truncate">{value}</p>
      </div>
      {copyable && hasValue && (
        <Button
          variant="ghost" size="icon" className="h-5 w-5 shrink-0"
          title={`Copiar ${label.toLowerCase()}`}
          onClick={() => {
            navigator.clipboard.writeText(value)
              .then(() => toast.success(`${label} copiado`))
              .catch(() => toast.error("Não consegui copiar"));
          }}
        >
          <Copy className="w-2.5 h-2.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
};

export default ContactPanel;

/** Editor de etiquetas da conversa — chips com remover + input pra criar. */
const TagsEditor = ({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) => {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim().toLowerCase();
    if (!t || tags.includes(t)) { setDraft(""); return; }
    onChange([...tags, t]);
    setDraft("");
  };

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] h-5 gap-1 pr-1">
              {t}
              <button
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="hover:text-destructive transition-colors"
                title="Remover etiqueta"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Nova etiqueta…"
          className="h-7 text-[11px]"
        />
        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={add} disabled={!draft.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
