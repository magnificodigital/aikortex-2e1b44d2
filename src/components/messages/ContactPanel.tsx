import { useState } from "react";
import { Mail, Phone, MapPin, Globe, Clock, Calendar, Building, Copy, MessageSquare, Flame, ArrowUpRight, X, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
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
}

const ContactPanel = ({ contact, tags = [], onTagsChange }: ContactPanelProps) => {
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
      <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</span>
      </div>
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
                  <h3 className="text-sm font-bold text-foreground">{contact.name}</h3>
                  {contact.company && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{contact.company}</p>
                  )}
                </div>
              </div>

              {/* Secoes acordeao (estilo Chatwoot) */}
              <Accordion type="multiple" defaultValue={["info", "crm"]} className="w-full">
                <AccordionItem value="info">
                  <AccordionTrigger className="text-xs font-semibold py-2.5">Informações do contato</AccordionTrigger>
                  <AccordionContent className="space-y-2.5 pb-3">
                    <InfoRow icon={Mail} label="Email" value={contact.email} copyable />
                    <InfoRow icon={Phone} label="Telefone" value={contact.phone} copyable />
                    {contact.company && <InfoRow icon={Building} label="Empresa" value={contact.company} />}
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

            </div>
          </ScrollArea>
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
