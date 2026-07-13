import { useState } from "react";
import {
  Send, CheckCheck, Check, AlertTriangle, Bot, User,
  CheckCircle2, RotateCcw, Sparkles, Loader2, StickyNote, Lock,
  Tag, X, Plus,
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
  /** Resolver/reabrir a conversa (status open <-> resolved). */
  onToggleResolve?: () => void;
  /** Grava nota interna (role 'note' — nunca vai pro cliente). */
  onSendNote?: (text: string) => void;
  /** AI Assist: pede rascunho de resposta; retorna o texto ou null. */
  onSuggestReply?: () => Promise<string | null>;
  /** Etiquetas da conversa — chips no topo do chat (estilo WhatsApp Web). */
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
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

const ChatArea = ({
  conversation, messages, onSend, aiEnabled = true, onToggleAi,
  onToggleResolve, onSendNote, onSuggestReply, tags = [], onTagsChange,
}: ChatAreaProps) => {
  const [input, setInput] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [suggesting, setSuggesting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const commitTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) onTagsChange?.([...tags, t]);
    setTagDraft("");
    setAddingTag(false);
  };

  const isResolved = conversation?.status === "resolved";

  const handleSend = () => {
    if (!input.trim()) return;
    if (composerMode === "note") {
      onSendNote?.(input);
    } else {
      onSend(input);
    }
    setInput("");
  };

  const handleSuggest = async () => {
    if (!onSuggestReply || suggesting) return;
    setSuggesting(true);
    try {
      const suggestion = await onSuggestReply();
      if (suggestion) {
        setComposerMode("reply");
        setInput(suggestion);
      }
    } finally {
      setSuggesting(false);
    }
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
        <div className="flex items-center gap-2">
          {onToggleAi && <AiToggleButton aiEnabled={aiEnabled} onToggle={onToggleAi} />}
          {onToggleResolve && (
            <Button
              size="sm"
              variant={isResolved ? "outline" : "default"}
              className="h-7 text-[11px] gap-1"
              onClick={onToggleResolve}
            >
              {isResolved
                ? (<><RotateCcw className="w-3 h-3" /> Reabrir</>)
                : (<><CheckCircle2 className="w-3 h-3" /> Resolver</>)}
            </Button>
          )}
        </div>
      </div>

      {/* Etiquetas — strip fina no topo do chat (referencia WhatsApp Web) */}
      {onTagsChange && (
        <div className="shrink-0 px-4 py-1.5 border-b border-border bg-card/60 flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              {t}
              <button onClick={() => onTagsChange(tags.filter((x) => x !== t))} className="hover:text-destructive transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTag();
                if (e.key === "Escape") { setTagDraft(""); setAddingTag(false); }
              }}
              onBlur={commitTag}
              placeholder="etiqueta…"
              className="h-5 w-28 px-2 rounded-full bg-muted text-[10px] outline-none border border-border focus:border-primary/50"
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="inline-flex items-center gap-0.5 h-5 px-2 rounded-full border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
            >
              <Plus className="w-2.5 h-2.5" /> tag
            </button>
          )}
        </div>
      )}

      {/* Messages — fundo com textura de pontos (vibe WhatsApp Web) */}
      <ScrollArea className="flex-1 bg-muted/20 [background-image:radial-gradient(hsl(var(--muted-foreground)/0.07)_1px,transparent_1px)] [background-size:18px_18px]">
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

            // Nota interna: card ambar central com cadeado — visivel so aqui.
            if (msg.isPrivate) {
              return (
                <div key={msg.id} className="flex justify-center py-1.5">
                  <div className="max-w-[80%] rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm text-foreground">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 mb-0.5">
                      <Lock className="w-2.5 h-2.5" /> Nota interna
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">{msg.time}</p>
                  </div>
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
                  "px-3 py-1.5 text-[13.5px] max-w-[68%] shadow-sm rounded-lg",
                  // "Rabinho" WhatsApp: canto superior reto na 1a msg do grupo
                  isOutgoing
                    ? cn("bg-primary text-primary-foreground", firstOfGroup && "rounded-tr-none")
                    : cn("bg-card text-foreground border border-border/50", firstOfGroup && "rounded-tl-none"),
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none",
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

      {/* Composer: Responder | Nota interna (role 'note', so' interna) +
          AI Assist (Erika rascunha, humano edita e envia). */}
      <div className="border-t border-border bg-card">
        <div className="px-3 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setComposerMode("reply")}
              className={cn(
                "flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-medium transition",
                composerMode === "reply" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Send className="w-3 h-3" /> Responder
            </button>
            {onSendNote && (
              <button
                onClick={() => setComposerMode("note")}
                className={cn(
                  "flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-medium transition",
                  composerMode === "note" ? "bg-amber-500/15 text-amber-600" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <StickyNote className="w-3 h-3" /> Nota interna
              </button>
            )}
          </div>
        </div>
        <div className="px-3 py-2 flex items-center gap-2">
          {/* Pilula estilo WhatsApp Web: input + varinha de IA dentro */}
          <div className={cn(
            "flex-1 flex items-center gap-1 rounded-full border px-4 h-11 transition-colors",
            composerMode === "note"
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-border bg-muted/40 focus-within:border-primary/40",
          )}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                composerMode === "note"
                  ? "Nota interna — o cliente NÃO vê…"
                  : "Digite sua mensagem…"
              }
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {onSuggestReply && composerMode === "reply" && (
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                title="A IA rascunha a resposta — você edita antes de enviar"
                className="shrink-0 text-primary hover:text-primary/80 transition disabled:opacity-50"
              >
                {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            )}
          </div>
          {/* Botao circular de enviar */}
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            title={composerMode === "note" ? "Salvar nota" : "Enviar"}
            className={cn(
              "shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition shadow-sm",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              composerMode === "note"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
            )}
          >
            {composerMode === "note" ? <StickyNote className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
