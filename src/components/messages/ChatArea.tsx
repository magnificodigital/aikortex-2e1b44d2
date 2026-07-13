import { useState } from "react";
import {
  Send, CheckCheck, Check, AlertTriangle, Bot, User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  /** Estado REAL do agente na conversa (conversations.ai_enabled). */
  aiEnabled?: boolean;
  onToggleAi?: (enabled: boolean) => void;
}

/** Toggle IA/Humano — wired no banco via onToggleAi (era fake antes). */
const AiToggleButton = ({ aiEnabled, onToggle }: { aiEnabled: boolean; onToggle: (v: boolean) => void }) => (
  <button
    onClick={() => onToggle(!aiEnabled)}
    className={cn(
      "flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border",
      aiEnabled
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
        : "bg-muted text-muted-foreground border-border hover:bg-accent"
    )}
    title={aiEnabled ? "IA respondendo — clique pra assumir a conversa" : "Você assumiu — clique pra devolver pra IA"}
  >
    {aiEnabled ? <Bot className="w-3.5 h-3.5 text-emerald-500" /> : <User className="w-3.5 h-3.5" />}
    {aiEnabled ? "IA respondendo" : "Você assumiu"}
  </button>
);

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta", in_progress: "Em andamento", waiting_client: "Aguardando",
  resolved: "Resolvida", closed: "Fechada",
};

const ChatArea = ({ conversation, messages, onSend, aiEnabled = true, onToggleAi }: ChatAreaProps) => {
  const [input, setInput] = useState("");

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
            {STATUS_LABELS[conversation.status ?? "open"] ?? conversation.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {onToggleAi && <AiToggleButton aiEnabled={aiEnabled} onToggle={onToggleAi} />}
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

      {/* Composer — so' o que funciona. Nota interna/anexos/audio voltam
          quando tiverem backend (a aba de nota antiga mandava a "nota" PRO
          CLIENTE como mensagem normal — removida por seguranca). */}
      <div className="border-t border-border bg-card">
        <div className="px-3 py-2 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiEnabled ? "Responder (assume a conversa e pausa a IA)…" : "Digite sua resposta…"}
            className="h-9 text-sm"
          />
          <Button
            size="sm"
            className="h-9 text-xs gap-1 shrink-0"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="w-3 h-3" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
