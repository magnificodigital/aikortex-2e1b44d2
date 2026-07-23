import { useEffect, useState } from "react";
import {
  Mail, Phone, MapPin, Globe, Building, Copy, MessageSquare, Flame,
  ArrowUpRight, X, Plus, Sparkles, Loader2, Send, Pencil, FileText,
  Instagram, Linkedin, ChevronDown,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ContactCustomFields {
  cnpj?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  instagram?: string;
  whatsapp?: string;
}

export interface ContactInfo {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  company?: string;
  customFields?: ContactCustomFields;
  /** Lead do CRM vinculado a esta conversa. */
  crm?: {
    id?: string | null;
    stage?: string | null;
    temperature?: string | null;
    company?: string | null;
  } | null;
}

export interface ContactPatch {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  stage_slug?: string;
  custom?: Partial<ContactCustomFields>;
}

const TEMP_LABEL: Record<string, { label: string; className: string }> = {
  hot:  { label: "Quente", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  warm: { label: "Morno",  className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  cold: { label: "Frio",   className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
};

interface Stage { slug: string; name: string; color: string | null; order_index: number }

interface ContactPanelProps {
  contact: ContactInfo | null;
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  copilotContext?: string;
  onSaveContact?: (patch: ContactPatch) => void;
}

const ContactPanel = ({ contact, tags = [], onTagsChange, copilotContext, onSaveContact }: ContactPanelProps) => {
  const [tab, setTab] = useState<"contact" | "copilot">("contact");
  const [stages, setStages] = useState<Stage[]>([]);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    (supabase.from("crm_pipeline_stages" as any) as any)
      .select("slug, name, color, order_index")
      .order("order_index", { ascending: true })
      .then(({ data }: any) => setStages((data as Stage[]) ?? []));
  }, []);

  if (!contact) {
    return (
      <div className="flex w-full lg:w-[300px] lg:min-w-[260px] border-l border-border bg-card flex-col h-full">
        <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Contato</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
          <p className="text-[13px] text-muted-foreground">
            Os dados do contato e o lead do CRM aparecem aqui ao selecionar uma conversa.
          </p>
        </div>
      </div>
    );
  }

  const cf = contact.customFields ?? {};
  const saveCustom = (k: keyof ContactCustomFields, v: string) => onSaveContact?.({ custom: { [k]: v } });
  const currentStage = stages.find((s) => s.slug === contact.crm?.stage);

  return (
    <div className="flex w-full lg:w-[300px] lg:min-w-[260px] border-l border-border bg-card flex-col h-full overflow-hidden">
      {/* Header — só Contato (Copilot removido; o AI Assist do composer já
          cobre a IA, sem amontoar um segundo surface aqui). */}
      <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
        <p className="text-[14px] font-semibold text-foreground">Contato</p>
      </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Header do contato */}
            <div className="flex flex-col items-center text-center space-y-2">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-[15px] font-semibold bg-muted text-muted-foreground">
                  {contact.initials.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <NameEditor name={contact.name} onSave={onSaveContact ? (v) => onSaveContact({ name: v }) : undefined} />
            </div>

            {/* Informações — 3 essenciais sempre; extras vazios atrás de "Mais
                campos" (campos já preenchidos aparecem sempre). Menos parede
                de "+ Adicionar" quando o lead é novo. */}
            <section className="space-y-2.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Informações</p>
              <EditableRow icon={Mail} label="Email" value={contact.email}
                onSave={onSaveContact ? (v) => onSaveContact({ email: v }) : undefined} />
              <EditableRow icon={Phone} label="Telefone" value={contact.phone}
                onSave={onSaveContact ? (v) => onSaveContact({ phone: v }) : undefined} />
              <EditableRow icon={Building} label="Empresa" value={contact.company || "—"}
                onSave={onSaveContact ? (v) => onSaveContact({ company: v }) : undefined} />
              {(showMore || cf.whatsapp) && <EditableRow icon={WhatsAppIcon} label="WhatsApp" value={cf.whatsapp || "—"}
                onSave={onSaveContact ? (v) => saveCustom("whatsapp", v) : undefined} />}
              {(showMore || cf.cnpj) && <EditableRow icon={FileText} label="CNPJ" value={cf.cnpj || "—"}
                onSave={onSaveContact ? (v) => saveCustom("cnpj", v) : undefined} />}
              {(showMore || cf.website) && <EditableRow icon={Globe} label="Website" value={cf.website || "—"}
                onSave={onSaveContact ? (v) => saveCustom("website", v) : undefined} />}
              {(showMore || cf.address) && <EditableRow icon={MapPin} label="Endereço" value={cf.address || "—"}
                onSave={onSaveContact ? (v) => saveCustom("address", v) : undefined} />}
              {(showMore || cf.linkedin) && <EditableRow icon={Linkedin} label="LinkedIn" value={cf.linkedin || "—"}
                onSave={onSaveContact ? (v) => saveCustom("linkedin", v) : undefined} />}
              {(showMore || cf.instagram) && <EditableRow icon={Instagram} label="Instagram" value={cf.instagram || "—"}
                onSave={onSaveContact ? (v) => saveCustom("instagram", v) : undefined} />}
              <button
                onClick={() => setShowMore((v) => !v)}
                className="text-[11px] font-medium text-primary/80 hover:text-primary transition flex items-center gap-1 pt-1"
              >
                {showMore ? "− Menos campos" : "+ Mais campos"}
              </button>
            </section>

            {/* CRM — inclui/edita a etapa direto daqui */}
            <section className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CRM</p>
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">Etapa no funil</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-8 justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 truncate">
                        {currentStage ? (
                          <>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: currentStage.color || "hsl(var(--muted-foreground))" }} />
                            {currentStage.name}
                          </>
                        ) : (
                          <span className="text-muted-foreground">+ Incluir no CRM</span>
                        )}
                      </span>
                      <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {stages.map((s) => (
                      <DropdownMenuItem
                        key={s.slug}
                        onClick={() => onSaveContact?.({ stage_slug: s.slug })}
                        className="text-[13px] gap-2"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color || "hsl(var(--muted-foreground))" }} />
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                    {stages.length === 0 && (
                      <DropdownMenuItem disabled className="text-[13px]">Sem etapas configuradas</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {contact.crm?.temperature && TEMP_LABEL[contact.crm.temperature] && (
                <Badge variant="outline" className={cn("text-[11px] h-5 gap-1", TEMP_LABEL[contact.crm.temperature].className)}>
                  <Flame className="w-2.5 h-2.5" />
                  {TEMP_LABEL[contact.crm.temperature].label}
                </Badge>
              )}
              {contact.crm?.id && (
                <Button asChild variant="ghost" size="sm" className="w-full h-7 text-[11px] gap-1 justify-start text-muted-foreground hover:text-foreground">
                  <Link to="/aikortex/crm">
                    Ver no CRM <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </Button>
              )}
            </section>

            {/* Etiquetas — agora vivem aqui, não em cima das mensagens */}
            {onTagsChange && (
              <section className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas</p>
                <TagsEditor tags={tags} onChange={onTagsChange} />
              </section>
            )}
          </div>
        </ScrollArea>
    </div>
  );
};

/** Copilot = Stark analisando a conversa. */
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
          className="h-8 text-[13px]"
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={ask} disabled={!question.trim() || asking}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

const NameEditor = ({ name, onSave }: { name: string; onSave?: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (!onSave) return <h3 className="text-[14px] font-bold text-foreground">{name}</h3>;
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
        className="text-[14px] font-bold bg-muted rounded px-2 py-0.5 outline-none border border-border focus:border-primary/50 text-center w-44"
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <h3 className="text-[14px] font-bold text-foreground">{name}</h3>
      <Button variant="ghost" size="icon" className="h-5 w-5" title="Editar nome"
        onClick={() => { setDraft(name); setEditing(true); }}>
        <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
      </Button>
    </span>
  );
};

const EditableRow = ({ icon: Icon, label, value, onSave }: {
  icon: any; label: string; value: string; onSave?: (v: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const empty = !value || value === "—";

  const commit = () => {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== value) onSave?.(v);
  };

  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
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
          onSave ? (
            <button
              onClick={() => { setDraft(""); setEditing(true); }}
              className="text-[11px] text-primary/80 hover:text-primary transition"
            >
              + Adicionar {label.toLowerCase()}
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground/60">—</p>
          )
        ) : (
          <p className="text-[11px] text-foreground truncate">{value}</p>
        )}
      </div>
      {!editing && !empty && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onSave && (
            <Button variant="ghost" size="icon" className="h-5 w-5" title={`Editar ${label.toLowerCase()}`}
              onClick={() => { setDraft(value); setEditing(true); }}>
              <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
            </Button>
          )}
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

export default ContactPanel;

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
            <Badge key={t} variant="secondary" className="text-[11px] h-5 gap-1 pr-1">
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
