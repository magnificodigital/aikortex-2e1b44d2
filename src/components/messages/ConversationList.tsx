/**
 * ConversationList — coluna esquerda do inbox.
 *
 * Redesign: item compacto de 2 linhas (nome+hora / preview+unread), canal
 * como mini-badge sobre o avatar (em vez de linha propria repetindo
 * "WhatsApp Business" em tudo), selecao com barra lateral. Sem botoes
 * decorativos — so' o que funciona.
 */
import { Search, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: string;
  contactName: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  channel: "whatsapp" | "instagram" | "email" | "web" | "facebook";
  assignee?: string;
  labels?: { name: string; color: string }[];
  inbox: string;
  priority?: "urgent" | "high" | "medium" | "low";
  /** Status da conversa (open | resolved | ...) — usado nas tabs. */
  status?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const channelBadge: Record<string, { label: string; className: string }> = {
  whatsapp:  { label: "WA", className: "bg-emerald-500 text-white" },
  instagram: { label: "IG", className: "bg-gradient-to-br from-pink-500 to-orange-400 text-white" },
  email:     { label: "@",  className: "bg-blue-500 text-white" },
  web:       { label: "W",  className: "bg-primary text-primary-foreground" },
  facebook:  { label: "f",  className: "bg-blue-600 text-white" },
};

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
}: ConversationListProps) => {
  const openCount = conversations.filter((c) => (c.status ?? "open") === "open").length;
  const unreadCount = conversations.filter((c) => c.unread > 0).length;

  const filtered = conversations
    .filter((c) => c.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((c) => {
      if (activeTab === "unread") return c.unread > 0;
      if (activeTab === "open") return (c.status ?? "open") === "open";
      return true;
    });

  return (
    <div className="w-[340px] min-w-[300px] border-r border-border bg-card flex flex-col h-full">
      {/* Header — mesma altura dos outros paineis (h-14) */}
      <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Conversas</h2>
        {unreadCount > 0 && (
          <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-primary text-primary-foreground rounded-full">
            {unreadCount}
          </Badge>
        )}
      </div>

      {/* Tabs + busca */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="open" className="flex-1 text-[11px] h-7">
              Abertas · {openCount}
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 text-[11px] h-7">
              Não lidas · {unreadCount}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-[11px] h-7">
              Todas · {conversations.length}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas…"
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
            <Inbox className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Nada encontrado nessa busca." : "Nenhuma conversa aqui."}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => {
              const ch = channelBadge[conv.channel] ?? channelBadge.whatsapp;
              const selected = selectedId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent/50",
                    selected && "bg-accent",
                  )}
                >
                  {selected && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />}

                  {/* Avatar com badge do canal */}
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-[11px] font-semibold bg-muted text-foreground/70">
                        {conv.initials.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-[7px] font-bold",
                      "flex items-center justify-center ring-2 ring-card",
                      ch.className,
                    )}>
                      {ch.label}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        conv.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                      )}>
                        {conv.contactName}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={cn(
                        "text-xs truncate",
                        conv.unread > 0 ? "text-foreground/80" : "text-muted-foreground",
                      )}>
                        {conv.lastMessage}
                      </p>
                      {conv.unread > 0 && (
                        <span className="shrink-0 h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
