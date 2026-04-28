import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Sparkles, ArrowRight, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import FlowCanvas from "./FlowCanvas";
import type { SavedFlow } from "@/types/flow-builder";

const DEERFLOW_URL = "https://aikortex-flow-production.up.railway.app/api/chat/completions";

const SYSTEM_PROMPT = `You are a flow builder assistant for Aikortex, a marketing automation platform. Your job is to help users create automation flows. Ask clarifying questions to understand their goal, then generate a flow as a JSON structure with nodes and edges compatible with React Flow. Each node should have: id, type (one of: trigger_chat, trigger_webhook, agent, extractor, decision, send_message, update_crm, api_webhook, condition, delay), position (x,y), and data (label, config, category, icon, description, color, nodeType matching the type). Edges have: id, source, target. Respond in Portuguese (Brazil). When you output a flow, wrap it in a \`\`\`json code block.`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const PLACEHOLDER_MSG = `Olá! 👋 Descreva o fluxo que você quer criar. Por exemplo:\n\n"Quero um fluxo de qualificação de leads pelo WhatsApp que registre no CRM e avise o vendedor quando o lead estiver quente."`;

interface Props {
  onBack: () => void;
  onSaveFlow: (name: string, nodes: unknown[], edges: unknown[], flowId?: string) => void;
  flows: SavedFlow[];
  onOpenFlow: (flow: SavedFlow) => void;
  onNewFlow: () => void;
  onSkipToCanvas: () => void;
}

export default function FlowCreationSplit({ onBack, onSaveFlow, flows, onOpenFlow, onNewFlow, onSkipToCanvas }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: PLACEHOLDER_MSG },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [generatedNodes, setGeneratedNodes] = useState<unknown[] | undefined>();
  const [generatedEdges, setGeneratedEdges] = useState<unknown[] | undefined>();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [flowName, setFlowName] = useState("Novo Fluxo");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const hasNodes = generatedNodes && generatedNodes.length > 0;

  // Extract JSON flow from AI response
  const extractFlowFromResponse = useCallback((text: string) => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return;
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.nodes && Array.isArray(parsed.nodes)) {
        // Ensure nodes have flowNode type for ReactFlow
        const mappedNodes = parsed.nodes.map((n: any, i: number) => ({
          id: n.id || `node-${i}`,
          type: "flowNode",
          position: n.position || { x: 100, y: 100 + i * 150 },
          data: {
            label: n.data?.label || n.type || "Nó",
            category: n.data?.category || "action",
            icon: n.data?.icon || "⚡",
            description: n.data?.description || "",
            config: n.data?.config || {},
            color: n.data?.color || "#6366f1",
            nodeType: n.data?.nodeType || n.type || "send_message",
          },
        }));
        const mappedEdges = (parsed.edges || []).map((e: any, i: number) => ({
          id: e.id || `edge-${i}`,
          source: e.source,
          target: e.target,
          type: "flowEdge",
        }));
        setGeneratedNodes(mappedNodes);
        setGeneratedEdges(mappedEdges);
      }
    } catch (e) {
      console.error("Failed to parse flow JSON:", e);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...updated.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content })),
    ];

    try {
      const resp = await fetch(DEERFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-flash", messages: apiMessages }),
      });

      if (!resp.ok) throw new Error(`Erro ${resp.status}`);

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && resp.body) {
        // SSE streaming
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        const assistantId = `a-${Date.now()}`;
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nlIdx: number;
          while ((nlIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nlIdx).trim();
            buffer = buffer.slice(nlIdx + 1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantText += content;
                const final = assistantText;
                setMessages(prev => {
                  const arr = [...prev];
                  arr[arr.length - 1] = { ...arr[arr.length - 1], content: final };
                  return arr;
                });
              }
            } catch {}
          }
        }
        extractFlowFromResponse(assistantText);
      } else {
        // JSON response
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || data.message?.content || JSON.stringify(data);
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "assistant", content }]);
        extractFlowFromResponse(content);
      }
    } catch (e: any) {
      console.error("DeerFlow error:", e);
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: `⚠️ ${e.message || "Erro ao conectar com a IA."}`,
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, extractFlowFromResponse]);

  // Strip JSON blocks from displayed messages
  const cleanContent = (text: string) =>
    text.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "").trim();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
            <X className="w-3.5 h-3.5" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Criar Fluxo com IA</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={onSkipToCanvas}>
            Começar do zero <ArrowRight className="w-3 h-3" />
          </Button>
          {hasNodes && (
            <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowSaveDialog(true)}>
              <Save className="w-3 h-3" /> Salvar fluxo
            </Button>
          )}
        </div>
      </div>

      {/* Split panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left: Chat */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Criar com IA</h3>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">DeerFlow</Badge>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      "rounded-xl px-3 py-2 text-xs max-w-[85%]",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-xs prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown>{cleanContent(msg.content) || (msg.content ? "✅ Fluxo gerado! Confira no canvas ao lado." : "")}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground">Pensando...</div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-border flex-shrink-0 space-y-2">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Descreva seu fluxo..."
                  className="min-h-[60px] max-h-[120px] text-xs resize-none pr-10"
                  rows={2}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-1.5 right-1.5 h-7 w-7"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
              <button
                onClick={onSkipToCanvas}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ou comece com um template →
              </button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Canvas */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="h-full relative">
            {isStreaming && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50">
                <Badge className="bg-primary/90 text-primary-foreground text-[10px] animate-pulse gap-1.5">
                  <Sparkles className="w-3 h-3" /> Gerando fluxo...
                </Badge>
              </div>
            )}
            <FlowCanvas
              initialNodes={generatedNodes}
              initialEdges={generatedEdges}
              flowName={flowName}
              onSave={onSaveFlow}
              flows={flows}
              onOpenFlow={onOpenFlow}
              onNewFlow={onNewFlow}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Fluxo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={flowName}
              onChange={e => setFlowName(e.target.value)}
              placeholder="Nome do fluxo"
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              onSaveFlow(flowName, generatedNodes || [], generatedEdges || []);
              setShowSaveDialog(false);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
