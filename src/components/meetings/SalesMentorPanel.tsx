import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  X,
  Lightbulb,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const MENTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-mentor`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "Abertura", prompt: "Como devo abrir essa reunião de vendas?" },
  { label: "Descoberta", prompt: "Quais perguntas de descoberta devo fazer agora?" },
  { label: "Objeções", prompt: "O cliente está com objeções sobre preço. Como responder?" },
  { label: "Fechamento", prompt: "Quais técnicas de fechamento posso usar agora?" },
];

interface Props {
  meetingTitle: string;
  liveTranscript?: string;
}

const SalesMentorPanel = ({ meetingTitle, liveTranscript }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send initial greeting when panel opens for the first time
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      sendMessage("A reunião está começando. Me dê dicas para iniciar bem essa call de vendas.");
    }
  }, [isOpen]);

  // Auto-send transcript context to mentor periodically
  const lastTranscriptRef = useRef("");
  useEffect(() => {
    if (!isOpen || !liveTranscript || isLoading) return;
    // Only send if there's new substantial content
    const newContent = liveTranscript.slice(lastTranscriptRef.current.length).trim();
    if (newContent.length < 30) return; // wait for enough new content

    const timer = setTimeout(() => {
      lastTranscriptRef.current = liveTranscript;
      sendMessage(
        `[CONTEXTO DA CONVERSA EM ANDAMENTO - não responda diretamente, use como contexto para dar a próxima dica de vendas]\n\n"${newContent}"\n\nCom base no que está sendo dito, me dê a próxima orientação estratégica.`
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, [liveTranscript, isOpen, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = { role: "user", content: text };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setInput("");
      setIsLoading(true);

      let assistantContent = "";

      try {
        const resp = await fetch(MENTOR_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, meetingTitle }),
        });

        if (!resp.ok || !resp.body) {
          const err = await resp.json().catch(() => ({ error: "Erro" }));
          toast.error(err.error || "Erro ao consultar mentor");
          setIsLoading(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1 ? { ...m, content: assistantContent } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } catch (e) {
        console.error("Mentor error:", e);
        toast.error("Erro ao conectar com o mentor de vendas");
      }
      setIsLoading(false);
    },
    [messages, meetingTitle]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm font-medium"
      >
        <BrainCircuit className="w-4 h-4" />
        Mentor de Vendas
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-20 right-4 z-50 flex flex-col rounded-xl border border-white/15 bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl transition-all ${
        isMinimized ? "w-72 h-12" : "w-80 sm:w-96"
      }`}
      style={isMinimized ? {} : { height: "min(500px, 60vh)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 cursor-pointer shrink-0"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white">Mentor de Vendas</span>
            <span className="text-[10px] text-white/40 ml-1.5">IA</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isMinimized ? (
            <ChevronUp className="w-4 h-4 text-white/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/50" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <Sparkles className="w-8 h-8 text-violet-400 mx-auto" />
                  <p className="text-xs text-white/50">
                    Seu mentor de vendas está pronto para ajudá-lo durante esta call.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs ${
                    msg.role === "user"
                      ? "text-white/70 bg-white/5 rounded-lg px-3 py-2"
                      : "text-white/90"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] font-semibold text-violet-400">Sugestão</span>
                      </div>
                      <div className="prose prose-sm prose-invert max-w-none text-xs [&_p]:mb-1 [&_ul]:mb-1 [&_li]:mb-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-2 text-xs text-violet-300">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  Analisando...
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick prompts */}
          <div className="px-3 py-1.5 flex gap-1.5 flex-wrap border-t border-white/5 shrink-0">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => !isLoading && sendMessage(qp.prompt)}
                disabled={isLoading}
                className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/60 hover:bg-violet-500/20 hover:text-violet-300 transition-colors disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1 shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Peça uma dica ao mentor..."
                className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-8 w-8 bg-violet-600 hover:bg-violet-500 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default SalesMentorPanel;
