import { useState } from "react";
import {
  Send, CheckCheck, Check, AlertTriangle, Bot, User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      {/* Chat Header — h-14, alinhado com os outros paineis */}
      <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-[11px] font-semibold bg-muted text-foreground/70">
              {conversation.initials.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{conversation.contactName}</h3>
            <p className="text-[11px] text-muted-foreground">
              {STATUS_LABELS[conversation.status ?? "open"] ?? conversation.status} · {conversation.inbox}
            </p>
          </div>
        </div>
        {onToggleAi && <AiToggleButton aiEnabled={aiEnabled} onToggle={onToggleAi} />}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-muted/20">
        <div className="px-4 py-5 space-y-1.5 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Bot className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Sem mensagens ainda nesta conversa.</p>
            </div>
          )}
          {messages.map((msg, i) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="flex justify-center py-2">
                  <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isOutgoing = msg.sender === "user" || msg.sender === "bot";
            // Agrupamento: 1a msg de uma sequencia do mesmo lado ganha canto
            // "de balao"; as seguintes ficam retas (visual messenger).
            const prev = messages[i - 1];
            const firstOfGroup = !prev || (prev.sender === "user" || prev.sender === "bot") !== isOutgoing;

            return (
              <div key={msg.id} className={cn("flex", isOutgoing ? "justify-end" : "justify-start", firstOfGroup && "pt-2")}>
                <div className={cn(
                  "px-3.5 py-2 text-sm max-w-[72%] shadow-sm",
                  "rounded-2xl",
                  isOutgoing
                    ? cn("bg-primary text-primary-foreground", firstOfGroup && "rounded-tr-md")
                    : cn("bg-card text-foreground border border-border/60", firstOfGroup && "rounded-tl-md"),
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-0.5 -mb-0.5",
                    isOutgoing ? "text-primary-foreground/60" : "text-muted-foreground/70",
                  )}>
                    {msg.sender === "bot" && <Bot className="w-2.5 h-2.5" />}
                    <span className="text-[10px]">{msg.time}</span>
                    {isOutgoing && msg.status && getStatusIcon(msg.status)}
                  </div>
                </div>
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
