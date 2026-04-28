import { useState } from "react";
import {
  Send, Paperclip, Smile, MoreVertical, CheckCheck, Check, AlertTriangle,
  ChevronDown, Bot, User, Mic, Image as ImageIcon, Bold, Italic, List, Link as LinkIcon,
  Code, ArrowUpRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Conversation } from "./ConversationList";

export interface ChatMessage {
  id: string;
  sender: "user" | "contact" | "bot" | "system";
  senderName?: string;
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read" | "failed";
  isPrivate?: boolean;
}

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

const AiToggleButton = () => {
  const [aiActive, setAiActive] = useState(true);
  return (
    <button
      onClick={() => setAiActive(!aiActive)}
      className={cn(
        "flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border",
        aiActive
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
          : "bg-muted text-muted-foreground border-border hover:bg-accent"
      )}
      title={aiActive ? "Clique para modo humano" : "Clique para ativar IA"}
    >
      {aiActive ? (
        <Bot className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <User className="w-3.5 h-3.5" />
      )}
      {aiActive ? "IA" : "Humano"}
    </button>
  );
};

const ChatArea = ({ conversation, messages, onSend }: ChatAreaProps) => {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"reply" | "note">("reply");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "read": return <CheckCheck className="w-3 h-3 text-primary" />;
      case "delivered": return <CheckCheck className="w-3 h-3 opacity-60" />;
      case "failed": return <AlertTriangle className="w-3 h-3 text-destructive" />;
      default: return <Check className="w-3 h-3 opacity-60" />;
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Chat Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
              {conversation.initials.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{conversation.contactName}</h3>
              {conversation.online && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 ml-2">
            Aberta
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
          <AiToggleButton />
        </div>
      </div>

      {/* Messages / Activity Tabs */}
      <div className="border-b border-border bg-card px-4">
        <div className="flex gap-4">
          <button className="text-xs font-medium text-primary border-b-2 border-primary py-2">Mensagens</button>
          <button className="text-xs font-medium text-muted-foreground py-2 hover:text-foreground transition-colors">Atividades</button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-background">
        <div className="p-4 space-y-3 max-w-3xl mx-auto">
          {messages.map((msg) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isOutgoing = msg.sender === "user" || msg.sender === "bot";
            return (
              <div key={msg.id} className={cn("flex gap-2", isOutgoing ? "justify-end" : "justify-start")}>
                {!isOutgoing && (
                  <Avatar className="h-6 w-6 mt-1 shrink-0">
                    <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                      {conversation.initials.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "rounded-lg px-3 py-2 text-sm max-w-[70%] shadow-sm",
                  isOutgoing
                    ? msg.isPrivate
                      ? "bg-amber-500/10 border border-amber-500/30 text-foreground"
                      : "bg-primary text-primary-foreground"
                    : "bg-card text-foreground border border-border"
                )}>
                  {msg.senderName && (
                    <p className={cn(
                      "text-[10px] font-semibold mb-0.5",
                      isOutgoing ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {msg.sender === "bot" && <Bot className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
                      {msg.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-1",
                    isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    <span className="text-[10px]">{msg.time}</span>
                    {isOutgoing && msg.status && getStatusIcon(msg.status)}
                  </div>
                </div>
                {isOutgoing && (
                  <Avatar className="h-6 w-6 mt-1 shrink-0">
                    <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                      {msg.sender === "bot" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Reply / Note Input */}
      <div className="border-t border-border bg-card">
        <div className="px-3 pt-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reply" | "note")}>
            <TabsList className="h-7">
              <TabsTrigger value="reply" className="text-[11px] h-6 px-3">
                <Send className="w-3 h-3 mr-1" /> Responder
              </TabsTrigger>
              <TabsTrigger value="note" className="text-[11px] h-6 px-3">
                <User className="w-3 h-3 mr-1" /> Nota Interna
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Formatting toolbar */}
        <div className="px-3 py-1.5 flex items-center gap-0.5 border-b border-border">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <Bold className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <Italic className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <List className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <LinkIcon className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <Code className="w-3 h-3" />
          </Button>
        </div>

        <div className="px-3 py-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeTab === "note" ? "Escreva uma nota interna..." : "Digite sua resposta..."}
            className={cn(
              "h-9 text-sm border-0 shadow-none focus-visible:ring-0 px-0",
              activeTab === "note" && "bg-amber-500/5"
            )}
          />
        </div>

        <div className="px-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <Paperclip className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ImageIcon className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <Smile className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <Mic className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button
            size="sm"
            className={cn("h-7 text-xs gap-1", activeTab === "note" && "bg-amber-600 hover:bg-amber-700")}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="w-3 h-3" />
            {activeTab === "note" ? "Adicionar Nota" : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
