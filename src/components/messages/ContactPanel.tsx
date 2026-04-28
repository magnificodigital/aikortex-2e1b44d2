import { Mail, Phone, MapPin, Globe, Clock, Calendar, Building, Copy, MessageSquare, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
}

interface ContactPanelProps {
  contact: ContactInfo | null;
}

const ContactPanel = ({ contact }: ContactPanelProps) => {
  if (!contact) return null;

  return (
    <div className="w-[300px] min-w-[260px] border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="border-b border-border px-3 py-2">
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
                  <div className="flex items-center gap-1.5 justify-center">
                    <h3 className="text-sm font-bold text-foreground">{contact.name}</h3>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Copy className="w-2.5 h-2.5 text-muted-foreground" />
                    </Button>
                  </div>
                  {contact.company && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{contact.company}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-2.5">
                <InfoRow icon={Mail} label="Email" value={contact.email} copyable />
                <InfoRow icon={Phone} label="Telefone" value={contact.phone} copyable />
                {contact.company && <InfoRow icon={Building} label="Empresa" value={contact.company} />}
                {contact.location && <InfoRow icon={MapPin} label="Localização" value={contact.location} />}
                {contact.language && <InfoRow icon={Globe} label="Idioma" value={contact.language} />}
                {contact.localTime && <InfoRow icon={Clock} label="Hora Local" value={contact.localTime} />}
                {contact.firstContact && <InfoRow icon={Calendar} label="Primeiro Contato" value={contact.firstContact} />}
              </div>

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

const InfoRow = ({ icon: Icon, label, value, copyable }: { icon: any; label: string; value: string; copyable?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-[11px] text-foreground truncate">{value}</p>
    </div>
    {copyable && (
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
        <Copy className="w-2.5 h-2.5 text-muted-foreground" />
      </Button>
    )}
  </div>
);

export default ContactPanel;
