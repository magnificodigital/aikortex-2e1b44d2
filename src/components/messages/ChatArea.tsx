import { useRef, useState } from "react";
import {
  Send, CheckCheck, Check, AlertTriangle, Bot, User,
  CheckCircle2, RotateCcw, Sparkles, Loader2, StickyNote, Lock,
  Tag, X, Plus, Bold, Italic, Code, Smile, VolumeX, Volume2, Share2, ChevronDown, Clock,
  Link2, Undo2, Redo2, List, ListOrdered, Paperclip, Maximize2, Globe, Instagram, Facebook,
} from "lucide-react";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect } from "react";
import { getConversationAvatar, setConversationAvatar, subscribeAvatar, fileToDataUrl } from "@/lib/conversation-avatars";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Conversation } from "./ConversationList";
import EmojiPicker from "./EmojiPicker";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

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
  /** Volta pra lista de conversas (mobile — layout de 1 coluna). */
  onBack?: () => void;
  /** Anexa um arquivo (imagem/documento) — sobe pro storage e envia. */
  onAttach?: (file: File) => void;
  /** true enquanto um anexo está subindo/enviando. */
  attaching?: boolean;
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
        : "bg-muted text-muted-foreground border-border hover:bg-muted/40"
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
  panelOpen = true, onTogglePanel, onBack, onAttach, attaching = false,
}: ChatAreaProps) => {
  const [input, setInput] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [suggesting, setSuggesting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => getConversationAvatar(conversation?.id));
  useEffect(() => { setAvatarUrl(getConversationAvatar(conversation?.id)); }, [conversation?.id]);
  useEffect(() => subscribeAvatar(() => setAvatarUrl(getConversationAvatar(conversation?.id))), [conversation?.id]);

  const handleAvatarPick = async (file: File | null | undefined) => {
    if (!file || !conversation?.id) return;
    if (!file.type.startsWith("image/")) { toast.error("Envie uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem maior que 2MB"); return; }
    try {
      const url = await fileToDataUrl(file);
      setConversationAvatar(conversation.id, url);
      toast.success("Foto atualizada");
    } catch { toast.error("Não consegui carregar a imagem"); }
  };

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
          <p className="text-[14px] text-muted-foreground">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Chat Header — layout clone Chatwoot: avatar + nome / inbox · Fechar detalhes | mute · share · Resolver */}
      <div className="h-14 shrink-0 border-b border-border flex items-center justify-between gap-3 px-4 bg-card">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Voltar pra lista — só no mobile (layout de 1 coluna) */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden -ml-1 mr-0.5 w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition shrink-0"
              title="Voltar pras conversas"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
          )}
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative group rounded-full shrink-0"
            title="Trocar foto do contato"
          >
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={conversation.contactName} />}
              <AvatarFallback className="text-[11px] font-semibold bg-muted text-foreground/70">
                {conversation.initials.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] font-medium text-white">
              Trocar
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleAvatarPick(e.target.files?.[0]); e.currentTarget.value = ""; }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-foreground truncate leading-tight">{conversation.contactName}</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
              {conversation.channel === "whatsapp" ? (
                <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
              ) : conversation.channel === "instagram" ? (
                <Instagram className="w-3.5 h-3.5 shrink-0 text-pink-500" />
              ) : conversation.channel === "facebook" ? (
                <Facebook className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              ) : (
                <Globe className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{conversation.inbox}</span>
              {onTogglePanel && (
                <>
                  <span className="opacity-50">·</span>
                  <button
                    onClick={onTogglePanel}
                    className="text-primary hover:underline shrink-0"
                  >
                    {panelOpen ? "Fechar detalhes" : "Mostrar detalhes"}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleAi && <AiToggleButton aiEnabled={aiEnabled} onToggle={onToggleAi} />}
          {onToggleResolve && (
            <div className="flex ml-1">
              <Button
                size="sm"
                variant={isResolved ? "outline" : "default"}
                className="h-8 text-[11px] font-medium gap-1.5 rounded-r-none px-3"
                onClick={onToggleResolve}
              >
                {isResolved
                  ? (<><RotateCcw className="w-3.5 h-3.5" /> Reabrir</>)
                  : (<><CheckCircle2 className="w-3.5 h-3.5" /> Resolver</>)}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant={isResolved ? "outline" : "default"}
                    className="h-8 w-7 px-0 rounded-l-none border-l border-primary-foreground/20"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSetStatus?.("open")} className="text-[13px] gap-2">
                    <RotateCcw className="w-3 h-3" /> Marcar como aberta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetStatus?.("waiting_client")} className="text-[13px] gap-2">
                    <Clock className="w-3 h-3" /> Aguardando cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetStatus?.("resolved")} className="text-[13px] gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Resolver
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>



      {/* Messages — fundo com textura de pontos (vibe WhatsApp Web) */}
      <ScrollArea className="flex-1 bg-background [background-image:radial-gradient(hsl(var(--muted-foreground)/0.05)_1px,transparent_1px)] [background-size:22px_22px]">
        <div className="px-5 py-6 space-y-2 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Bot className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">Sem mensagens ainda nesta conversa.</p>
            </div>
          )}
          {messages.map((msg, i) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="flex justify-center py-2">
                  <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            // Nota interna: card ambar central com cadeado — visivel so aqui.
            if (msg.isPrivate) {
              return (
                <div key={msg.id} className="flex justify-center py-1.5">
                  <div className="max-w-[80%] rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-[14px] text-foreground">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 mb-0.5">
                      <Lock className="w-2.5 h-2.5" /> Nota interna
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className="text-[11px] text-muted-foreground text-right mt-0.5">{msg.time}</p>
                  </div>
                </div>
              );
            }

            const isOutgoing = msg.sender === "user" || msg.sender === "bot";
            // Agrupamento por lado: avatar aparece só na última msg do grupo,
            // no lado de fora (estilo Chative/Intercom). Bolhas uniformes.
            const sideOf = (m?: ChatMessage) => (m ? (m.sender === "user" || m.sender === "bot") : null);
            const firstOfGroup = sideOf(messages[i - 1]) !== isOutgoing;
            const lastOfGroup = sideOf(messages[i + 1]) !== isOutgoing;

            const avatar = (
              <div className="w-7 shrink-0 self-end">
                {lastOfGroup && (
                  <div className={cn(
                    "w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold",
                    isOutgoing ? "bg-primary/15 text-primary" : "bg-foreground/10 text-muted-foreground",
                  )}>
                    {isOutgoing ? <Bot className="w-3.5 h-3.5" /> : (conversation?.initials ?? "?")}
                  </div>
                )}
              </div>
            );

            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isOutgoing ? "justify-end" : "justify-start", firstOfGroup && "pt-2.5")}>
                {!isOutgoing && avatar}
                <div className={cn(
                  "px-3.5 py-2 text-[14px] max-w-[70%] shadow-sm rounded-2xl",
                  isOutgoing
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/[0.07] text-foreground border border-foreground/[0.08]",
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none",
                    isOutgoing ? "text-primary-foreground/60" : "text-muted-foreground/70",
                  )}>
                    <span className="text-[11px]">{msg.time}</span>
                    {isOutgoing && msg.status && getStatusIcon(msg.status)}
                  </div>
                </div>
                {isOutgoing && avatar}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Composer clone Chatwoot: tabs Reply|Nota → toolbar → textarea →
          [emoji] ....... [AI Assist] [Enviar (↵)] */}
      <div className="p-3 bg-gradient-to-b from-transparent to-primary/[0.04]">
        <div className={cn(
          "rounded-xl border shadow-sm overflow-hidden transition-colors",
          "bg-gradient-to-br from-card via-card to-primary/[0.08]",
          composerMode === "note" ? "border-amber-500/40" : "border-border focus-within:border-primary/40",
        )}>
          {/* Tabs — underline estilo Chatwoot */}
          <div className="px-3 pt-1 flex items-center gap-5 border-b border-border/60">
            <button
              onClick={() => setComposerMode("reply")}
              className={cn(
                "relative h-9 text-[11px] font-medium transition",
                composerMode === "reply"
                  ? "text-foreground after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] after:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Responder
            </button>
            {onSendNote && (
              <button
                onClick={() => setComposerMode("note")}
                className={cn(
                  "relative h-9 text-[11px] font-medium transition",
                  composerMode === "note"
                    ? "text-amber-600 after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] after:bg-amber-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Notas
              </button>
            )}
          </div>


          {/* Toolbar de formatacao — escondida por padrão (toggle "Aa" no rodapé) */}
          {showFormat && (
          <div className="px-3 py-1.5 flex items-center gap-0.5 border-b border-border/60">
            <button onClick={() => wrapSelection("*")} title="Negrito (*texto*)"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <Bold className="w-3 h-3" />
            </button>
            <button onClick={() => wrapSelection("_")} title="Itálico (_texto_)"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <Italic className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const url = window.prompt("URL do link");
                if (url) insertAtCursor(`[${url}](${url})`);
              }}
              title="Inserir link"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <Link2 className="w-3 h-3" />
            </button>
            <div className="w-px h-3.5 bg-border mx-1" />
            <button
              onClick={() => document.execCommand?.("undo")}
              title="Desfazer"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => document.execCommand?.("redo")}
              title="Refazer"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <Redo2 className="w-3 h-3" />
            </button>
            <div className="w-px h-3.5 bg-border mx-1" />
            <button
              onClick={() => insertAtCursor("\n• ")}
              title="Lista"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <List className="w-3 h-3" />
            </button>
            <button
              onClick={() => insertAtCursor("\n1. ")}
              title="Lista numerada"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <ListOrdered className="w-3 h-3" />
            </button>
            <button onClick={() => wrapSelection("```")} title="Código (```texto```)"
              className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
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
              className="ml-auto w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
          )}

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
              "w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground resize-none leading-relaxed px-3 py-2.5 max-h-[130px]",
              composerMode === "note" && "bg-amber-500/5",
            )}
          />

          {/* Rodape: emoji + anexo + audio + assinatura | AI Assist + Enviar */}
          <div className="px-2.5 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button title="Emoji"
                    className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
                    <Smile className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-auto p-1.5">
                  <EmojiPicker onPick={insertAtCursor} />
                </PopoverContent>
              </Popover>
              {/* Anexar imagem/documento — sobe pro storage e envia como mídia */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onAttach) onAttach(file);
                  e.target.value = "";
                }}
              />
              <button
                title="Anexar imagem ou documento"
                onClick={() => fileInputRef.current?.click()}
                disabled={!onAttach || attaching || composerMode === "note"}
                className="w-8 h-8 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition disabled:opacity-40"
              >
                {attaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <button
                title="Formatação (negrito, itálico, listas…)"
                onClick={() => setShowFormat((v) => !v)}
                className={cn(
                  "w-8 h-8 rounded-md grid place-items-center text-[13px] font-semibold transition",
                  showFormat ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                Aa
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
                className={cn("h-8 text-[13px] gap-1", composerMode === "note" && "bg-amber-600 hover:bg-amber-700 text-white")}
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
