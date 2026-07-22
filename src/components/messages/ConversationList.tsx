/**
 * ConversationList — coluna esquerda do inbox.
 *
 * Redesign: item compacto de 2 linhas (nome+hora / preview+unread), canal
 * como mini-badge sobre o avatar (em vez de linha propria repetindo
 * "WhatsApp Business" em tudo), selecao com barra lateral. Sem botoes
 * decorativos — so' o que funciona.
 */
import { Search, Inbox, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { getConversationAvatar, subscribeAvatar } from "@/lib/conversation-avatars";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface InboxFilter {
  view: "all" | "unattended";
  channel: string | null; // null = todos
  tag: string | null;
}

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
  /** Ultima mensagem foi nossa (↩ no preview, estilo Chatwoot). */
  lastOutgoing?: boolean;
  /** Idade da conversa ("3mo") — mostrada junto do tempo da ultima msg. */
  createdAgo?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Filtro por canal/etiqueta/nao-atendidas (dropdown do funil). */
  filter?: InboxFilter;
  onFilterChange?: (f: InboxFilter) => void;
  /** Etiquetas existentes (agregadas) pro dropdown. */
  availableTags?: string[];
}

const FILTER_CHANNELS: { key: string; label: string; dot: string; soon?: boolean }[] = [
  { key: "whatsapp",  label: "WhatsApp Business", dot: "bg-emerald-500" },
  { key: "instagram", label: "Instagram",         dot: "bg-pink-500" },
  { key: "facebook",  label: "Facebook",          dot: "bg-blue-600" },
  { key: "email",     label: "E-mail (em breve)", dot: "bg-blue-500", soon: true },
];

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
  filter,
  onFilterChange,
  availableTags = [],
}: ConversationListProps) => {
  const mineCount = conversations.filter((c) => (c.status ?? "open") === "open").length;
  const unassignedCount = conversations.filter((c) => c.unread > 0).length;
  const activeFilters = (filter?.channel ? 1 : 0) + (filter?.tag ? 1 : 0) + (filter?.view === "unattended" ? 1 : 0);

  // Re-render quando um avatar for trocado no header do chat.
  const [avatarTick, setAvatarTick] = useState(0);
  useEffect(() => subscribeAvatar(() => setAvatarTick((t) => t + 1)), []);

  const filtered = conversations
    .filter((c) => c.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((c) => {
      if (activeTab === "unread") return c.unread > 0;
      if (activeTab === "open") return (c.status ?? "open") === "open";
      return true;
    });

  return (
    <div className="w-[340px] min-w-[300px] border-r border-border bg-card flex flex-col h-full">
      {/* Header — mesma altura dos outros paineis (h-14) + funil de filtros */}
      <div className="h-14 shrink-0 px-4 flex items-center border-b border-border">
        <h2 className="text-[14px] font-semibold text-foreground">Conversas</h2>
        {unassignedCount > 0 && (
          <Badge className="ml-2 h-5 px-1.5 text-[11px] bg-primary text-primary-foreground rounded-full">
            {unassignedCount}
          </Badge>
        )}
        {filter && onFilterChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Filtrar por canal, etiqueta e mais"
                className={cn(
                  "ml-auto relative w-7 h-7 rounded-md grid place-items-center transition",
                  activeFilters > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                {activeFilters > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center">
                    {activeFilters}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider">Canal</DropdownMenuLabel>
              {FILTER_CHANNELS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  disabled={c.soon}
                  checked={filter.channel === c.key}
                  onCheckedChange={(v) => onFilterChange({ ...filter, channel: v ? c.key : null })}
                  className="text-[13px] gap-2"
                >
                  <span className={cn("w-2 h-2 rounded-full", c.dot, c.soon && "opacity-40")} />
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider">Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filter.view === "unattended"}
                onCheckedChange={(v) => onFilterChange({ ...filter, view: v ? "unattended" : "all" })}
                className="text-[13px]"
              >
                Só não atendidas
              </DropdownMenuCheckboxItem>
              {availableTags.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider">Etiqueta</DropdownMenuLabel>
                  {availableTags.map((t) => (
                    <DropdownMenuCheckboxItem
                      key={t}
                      checked={filter.tag === t}
                      onCheckedChange={(v) => onFilterChange({ ...filter, tag: v ? t : null })}
                      className="text-[13px]"
                    >
                      {t}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabs + busca */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full h-8 bg-transparent p-0 gap-4 rounded-none border-b border-border justify-start">
            <TabsTrigger
              value="open"
              className="relative h-8 px-0 text-[11px] font-medium rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-[9px] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary"
            >
              Abertas <span className="ml-1 text-[11px] opacity-70">· {mineCount}</span>
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="relative h-8 px-0 text-[11px] font-medium rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-[9px] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary"
            >
              Não lidas <span className="ml-1 text-[11px] opacity-70">· {unassignedCount}</span>
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="relative h-8 px-0 text-[11px] font-medium rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-[9px] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary"
            >
              Todas <span className="ml-1 text-[11px] opacity-70">· {conversations.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas…"
            className="pl-8 h-8 text-[13px] bg-background"
          />
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
            <Inbox className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">
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
                    "w-[calc(100%-12px)] mx-1.5 my-0.5 flex items-center gap-3 px-2.5 py-2.5 text-left transition-colors rounded-xl border",
                    selected
                      ? "bg-accent border-primary/40"
                      : "border-transparent hover:bg-muted/40",
                  )}
                >

                  {/* Avatar com badge do canal */}
                  <div className="relative shrink-0 self-start mt-0.5">
                    <Avatar className="h-10 w-10">
                      {(() => { const u = getConversationAvatar(conv.id); return u ? <AvatarImage src={u} alt={conv.contactName} /> : null; })()}
                      <AvatarFallback className="text-[11px] font-semibold bg-muted text-foreground/70">
                        {conv.initials.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-[11px] font-bold",
                      "flex items-center justify-center ring-2 ring-card",
                      ch.className,
                    )}>
                      {ch.label}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Nome do contato (destaque) + hora da última msg.
                        O canal já aparece no badge do avatar — sem linha
                        redundante de "WhatsApp Business". */}
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-[14px] truncate",
                        conv.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                      )}>
                        {conv.contactName}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">{conv.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={cn(
                        "text-[13px] truncate",
                        conv.unread > 0 ? "text-foreground/80" : "text-muted-foreground",
                      )}>
                        {conv.lastOutgoing ? "↩ " : ""}{conv.lastMessage}
                      </p>
                      {conv.unread > 0 && (
                        <span className="shrink-0 h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold grid place-items-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    {conv.labels && conv.labels.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {conv.labels.slice(0, 3).map((l) => (
                          <span key={l.name} className="inline-flex items-center h-4 px-1.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                            {l.name}
                          </span>
                        ))}
                        {conv.labels.length > 3 && (
                          <span className="text-[11px] text-muted-foreground">+{conv.labels.length - 3}</span>
                        )}
                      </div>
                    )}
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
