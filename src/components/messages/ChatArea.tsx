import { useRef, useState } from "react";
import {
  Send, CheckCheck, Check, AlertTriangle, Bot, User,
  CheckCircle2, RotateCcw, Sparkles, Loader2, StickyNote, Lock,
  Tag, X, Plus, Bold, Italic, Code, Smile, VolumeX, Volume2, Share2, ChevronDown, Clock,
  Link2, Undo2, Redo2, List, ListOrdered, Mic, PenLine, Paperclip, Maximize2, Globe,
  PanelRightClose, PanelRightOpen,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  /** Muta notificacoes da conversa (metadata.muted). */
  muted?: boolean;
  onToggleMute?: () => void;
  /** Copia link direto da conversa. */
  onShare?: () => void;
  /** Muda status direto (dropdown do Resolver). */
  onSetStatus?: (status: "open" | "waiting_client" | "resolved") => void;
  /** Mostra/esconde o painel de detalhes ("Fechar detalhes" da referencia). */
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

const EMOJIS = [
  "😀","😂","😍","🙏","👍","👎","🎉","🔥","❤️","😢",
  "😮","😅","🤝","👋","💰","📅","✅","❌","⏰","🚀",
];

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
    title={aiEnabled ? "Agente de IA respondendo — clique pra assumir a conversa" : "Você assumiu — clique pra devolver pra IA"}
  >
    {aiEnabled ? <Bot className="w-3.5 h-3.5 text-emerald-500" /> : <User className="w-3.5 h-3.5" />}
    {aiEnabled ? "Agente de IA" : "Você assumiu"}
  </button>
);

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta", in_progress: "Em andamento", waiting_client: "Aguardando",
  resolved: "Resolvida", closed: "Fechada",
};

const ChatArea = ({
  conversation, messages, onSend, aiEnabled = true, onToggleAi,
  onToggleResolve, onSendNote, onSuggestReply, tags = [], onTagsChange,
  muted = false, onToggleMute, onShare, onSetStatus,
  panelOpen = true, onTogglePanel,
}: ChatAreaProps) => {
  const [input, setInput] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [suggesting, setSuggesting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Formatacao WhatsApp: *negrito* _italico_ ```codigo``` na selecao. */
  const wrapSelection = (marker: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    setInput(input.slice(0, s) + marker + input.slice(s, e) + marker + input.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + marker.length, e + marker.length);
    });
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const s = el?.selectionStart ?? input.length;
    const e = el?.selectionEnd ?? input.length;
    setInput(input.slice(0, s) + text + input.slice(e));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + text.length, s + text.length);
    });
  };

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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
      <div className="h-14 shrink-0 border-b border-border flex items-center justify-between gap-3 px-4 bg-card">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-[11px] font-semibold bg-muted text-foreground/70">
              {conversation.initials.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{conversation.contactName}</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{conversation.inbox}</span>
              <span className="opacity-50">·</span>
              <span className="truncate">{STATUS_LABELS[conversation.status ?? "open"] ?? conversation.status}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleAi && <AiToggleButton aiEnabled={aiEnabled} onToggle={onToggleAi} />}
          {onToggleResolve && (
            <div className="flex">
              <Button
                size="sm"
                variant={isResolved ? "outline" : "default"}
                className="h-7 text-[11px] gap-1 rounded-r-none"
                onClick={onToggleResolve}
              >
                {isResolved
                  ? (<><RotateCcw className="w-3 h-3" /> Reabrir</>)
                  : (<><CheckCircle2 className="w-3 h-3" /> Resolver</>)}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant={isResolved ? "outline" : "default"}
                    className="h-7 w-6 px-0 rounded-l-none border-l border-primary-foreground/20"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSetStatus?.("open")} className="text-xs gap-2">
                    <RotateCcw className="w-3 h-3" /> Marcar como aberta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetStatus?.("waiting_client")} className="text-xs gap-2">
                    <Clock className="w-3 h-3" /> Aguardando cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetStatus?.("resolved")} className="text-xs gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Resolver
                  </DropdownMenuItem>
                  {onToggleMute && (
                    <DropdownMenuItem onClick={onToggleMute} className="text-xs gap-2">
                      {muted ? <><Volume2 className="w-3 h-3" /> Reativar notificações</> : <><VolumeX className="w-3 h-3" /> Silenciar conversa</>}
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onClick={onShare} className="text-xs gap-2">
                      <Share2 className="w-3 h-3" /> Copiar link da conversa
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {onTogglePanel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onTogglePanel}
              title={panelOpen ? "Fechar detalhes" : "Mostrar detalhes"}
            >
              {panelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
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

      {/* Composer clone Chatwoot: tabs Reply|Nota → toolbar → textarea →
          [emoji] ....... [AI Assist] [Enviar (↵)] */}
      <div className="p-3">
        <div className={cn(
          "rounded-xl border bg-card shadow-sm overflow-hidden transition-colors",
          composerMode === "note" ? "border-amber-500/40" : "border-border focus-within:border-primary/40",
        )}>
          {/* Tabs */}
          <div className="px-3 pt-2.5 flex items-center gap-1">
            <button
              onClick={() => setComposerMode("reply")}
              className={cn(
                "h-6 px-3 rounded-full text-[11px] font-medium transition",
                composerMode === "reply" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Responder
            </button>
            {onSendNote && (
              <button
                onClick={() => setComposerMode("note")}
                className={cn(
                  "flex items-center gap-1 h-6 px-3 rounded-full text-[11px] font-medium transition",
                  composerMode === "note" ? "bg-amber-500/15 text-amber-600" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Lock className="w-2.5 h-2.5" /> Nota interna
              </button>
            )}
          </div>

          {/* Toolbar de formatacao (markdown do WhatsApp — funcional) */}
          <div className="px-3 py-1.5 flex items-center gap-0.5 border-b border-border/60">
            <button onClick={() => wrapSelection("*")} title="Negrito (*texto*)"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <Bold className="w-3 h-3" />
            </button>
            <button onClick={() => wrapSelection("_")} title="Itálico (_texto_)"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <Italic className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const url = window.prompt("URL do link");
                if (url) insertAtCursor(`[${url}](${url})`);
              }}
              title="Inserir link"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <Link2 className="w-3 h-3" />
            </button>
            <div className="w-px h-3.5 bg-border mx-1" />
            <button
              onClick={() => document.execCommand?.("undo")}
              title="Desfazer"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => document.execCommand?.("redo")}
              title="Refazer"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <Redo2 className="w-3 h-3" />
            </button>
            <div className="w-px h-3.5 bg-border mx-1" />
            <button
              onClick={() => insertAtCursor("\n• ")}
              title="Lista"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <List className="w-3 h-3" />
            </button>
            <button
              onClick={() => insertAtCursor("\n1. ")}
              title="Lista numerada"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <ListOrdered className="w-3 h-3" />
            </button>
            <button onClick={() => wrapSelection("```")} title="Código (```texto```)"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
              <Code className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const el = textareaRef.current;
                if (!el) return;
                if (el.style.height === "260px") {
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
                } else {
                  el.style.height = "260px";
                }
              }}
              title="Expandir composer"
              className="ml-auto w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 130)}px`;
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              composerMode === "note"
                ? "Nota interna — o cliente NÃO vê…"
                : "Shift + Enter para nova linha…"
            }
            className={cn(
              "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground resize-none leading-relaxed px-3 py-2.5 max-h-[130px]",
              composerMode === "note" && "bg-amber-500/5",
            )}
          />

          {/* Rodape: emoji + anexo + audio + assinatura | AI Assist + Enviar */}
          <div className="px-2.5 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button title="Emoji"
                    className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
                    <Smile className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-56 p-2">
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => insertAtCursor(e)}
                        className="w-6 h-6 rounded grid place-items-center hover:bg-accent text-base">
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button title="Anexar arquivo"
                className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
                <Paperclip className="w-4 h-4" />
              </button>
              <button title="Gravar áudio"
                className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
                <Mic className="w-4 h-4" />
              </button>
              <button title="Assinatura"
                className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-accent transition">
                <PenLine className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onSuggestReply && composerMode === "reply" && (
                <button
                  onClick={handleSuggest}
                  disabled={suggesting}
                  className="relative flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/30 hover:border-primary/50 transition disabled:opacity-50"
                  title="A IA rascunha — você edita antes de enviar"
                >
                  {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Assist
                  {!suggesting && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </button>
              )}
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn("h-8 text-xs gap-1", composerMode === "note" && "bg-amber-600 hover:bg-amber-700 text-white")}
              >
                {composerMode === "note" ? "Salvar nota" : <>Enviar <span className="opacity-70">(↵)</span></>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
