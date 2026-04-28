import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Mic, RefreshCw, Sparkles, ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { NODE_TEMPLATES } from "@/types/flow-builder";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isFlowGenerated?: boolean;
}

const SUGGESTIONS = [
  "Bot de qualificação de leads via WhatsApp",
  "Sistema de agendamento para clínicas por WhatsApp",
  "CRM conversacional com follow-up automático",
  "Onboarding guiado com coleta de dados via chat",
];

interface Props {
  onClose: () => void;
  onAddNode?: (nodeType: string) => void;
  onBuildFlow?: (flowDef: { nodes: { id: string; type: string }[]; edges: { source: string; target: string }[] }) => void;
  initialPrompt?: string;
}

export default function FlowCopilotPanel({ onClose, onAddNode, onBuildFlow, initialPrompt }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoSend = useRef(false);
  const lastUserMsg = useRef<string>("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const extractJsonFromResponse = (text: string): any | null => {
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try { return JSON.parse(jsonBlockMatch[1].trim()); } catch { /* */ }
    }
    const buildFlowMatch = text.match(/\[BUILD_FLOW\]\s*([\s\S]*?)\s*\[\/BUILD_FLOW\]/);
    if (buildFlowMatch) {
      try { return JSON.parse(buildFlowMatch[1].trim()); } catch { /* */ }
    }
    return null;
  };

  const parseAndExecuteCommands = useCallback(
    (text: string) => {
      const flowDef = extractJsonFromResponse(text);
      if (flowDef?.nodes && flowDef?.edges && onBuildFlow) {
        onBuildFlow(flowDef);
        return true;
      }
      if (!onAddNode) return false;
      const regex = /\[ADD_NODE:(\w+)\]/g;
      let match;
      let found = false;
      while ((match = regex.exec(text)) !== null) {
        const nodeType = match[1];
        if (NODE_TEMPLATES.some((t) => t.type === nodeType)) {
          onAddNode(nodeType);
          found = true;
        }
      }
      return found;
    },
    [onAddNode, onBuildFlow]
  );

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = overrideText || input;
      if (!text.trim() || isStreaming) return;

      setHasError(false);
      lastUserMsg.current = text.trim();

      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg]);
      if (!overrideText) setInput("");
      setIsStreaming(true);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deerflow-proxy`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: conversationHistory }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const aiContent = data?.choices?.[0]?.message?.content || data?.error;
        if (!aiContent) throw new Error("Resposta vazia do servidor");

        const flowGenerated = parseAndExecuteCommands(aiContent);

        const displayText = aiContent
          .replace(/\[BUILD_FLOW\][\s\S]*?\[\/BUILD_FLOW\]/g, "")
          .replace(/\[ADD_NODE:\w+\]/g, "")
          .replace(/```json[\s\S]*?```/g, "")
          .trim();

        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: flowGenerated
            ? (displayText || "✅ Fluxo gerado! Confira no canvas ao lado.")
            : (displayText || "Desculpe, não consegui processar sua solicitação."),
          isFlowGenerated: flowGenerated,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e: any) {
        console.error("Copilot chat error:", e);
        setHasError(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: "⚠️ Erro ao conectar. Verifique sua conexão e tente novamente.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [input, messages, isStreaming, parseAndExecuteCommands]
  );

  const handleRetry = () => {
    if (lastUserMsg.current) handleSend(lastUserMsg.current);
  };

  useEffect(() => {
    if (initialPrompt && !didAutoSend.current && !isStreaming) {
      didAutoSend.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt, handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {isEmpty ? (
          // Welcome state — matches Studio "Descobrir" screen
          <div className="flex flex-col items-center justify-center h-full px-6 py-8">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-foreground/70" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5 text-center">
              Descreva seu fluxo
            </h3>
            <p className="text-xs text-muted-foreground text-center max-w-[260px] mb-8 leading-relaxed">
              Conte o que sua automação deve fazer. A IA vai estruturar tudo automaticamente.
            </p>

            <p className="text-[11px] text-muted-foreground mb-3">ou comece com uma ideia:</p>
            <div className="w-full space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/30 text-foreground/80 hover:text-foreground transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-3.5 py-2 text-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="text-sm leading-relaxed text-foreground flex-1 min-w-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none
                        [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5
                        [&_strong]:text-foreground
                        [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.isFlowGenerated && (
                        <button
                          onClick={() => setInput("Refinar o fluxo: ")}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          Refinar fluxo <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs">Gerando...</span>
                </div>
              </div>
            )}

            {hasError && !isStreaming && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-full" onClick={handleRetry}>
                  <RefreshCw className="w-3 h-3" /> Tentar novamente
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — matches Studio composer */}
      <div className="p-3 border-t border-border">
        <div className="rounded-xl border border-border bg-card/50 p-1 transition-colors focus-within:border-primary/30">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Um fluxo que qualifica leads pelo WhatsApp e envia para o CRM..."
            rows={2}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[44px] max-h-[120px]"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" disabled={isStreaming}>
              <Mic className="w-3.5 h-3.5" />
            </button>
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className="h-7 gap-1.5 rounded-full bg-primary hover:bg-primary/90 text-[11px] px-3"
            >
              <Sparkles className="w-3 h-3" /> Estruturar com IA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
