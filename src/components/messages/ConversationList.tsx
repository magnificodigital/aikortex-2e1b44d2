import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const channelIcons: Record<string, { label: string; className: string }> = {
  whatsapp: { label: "WA", className: "bg-emerald-500 text-white" },
  instagram: { label: "IG", className: "bg-pink-500 text-white" },
  email: { label: "✉", className: "bg-blue-500 text-white" },
  web: { label: "W", className: "bg-primary text-primary-foreground" },
  facebook: { label: "FB", className: "bg-blue-600 text-white" },
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
  const filtered = conversations.filter((c) =>
    c.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[340px] min-w-[300px] border-r border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-1 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-foreground">Conversas</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Filter className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="mine" className="flex-1 text-[11px] h-7 gap-1">
              Minhas <Badge variant="secondary" className="h-4 px-1 text-[10px]">11</Badge>
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="flex-1 text-[11px] h-7 gap-1">
              Não atribuídas <Badge variant="secondary" className="h-4 px-1 text-[10px]">6</Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-[11px] h-7 gap-1">
              Todas <Badge variant="secondary" className="h-4 px-1 text-[10px]">19</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="py-0.5">
          {filtered.map((conv) => {
            const ch = channelIcons[conv.channel];
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-border/50 hover:bg-accent/50",
                  selectedId === conv.id && "bg-accent"
                )}
              >
                <div className="relative shrink-0 mt-0.5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-[11px] font-medium bg-muted text-muted-foreground">
                      {conv.initials.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center shrink-0", ch.className)}>
                        {ch.label}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{conv.inbox}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">{conv.contactName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                  {conv.labels && conv.labels.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {conv.labels.map((l) => (
                        <span key={l.name} className={cn("inline-flex items-center gap-1 text-[10px] text-muted-foreground")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", l.color)} />
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {conv.unread > 0 && (
                  <Badge className="h-4 min-w-[18px] px-1 text-[10px] bg-primary text-primary-foreground rounded-full shrink-0 mt-1">
                    {conv.unread}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
