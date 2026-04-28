import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, ArrowUp, Send, AlertTriangle,
  Sparkles, Bot, Mic, MicOff, Check, Loader2, Pencil, RotateCw, Brain, Lock, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/use-agent-chat";
import type { AgentType } from "@/types/agent-builder";

export interface StructuredAgentConfig {
  agent_name: string;
  agent_type: string;
  description: string;
  objective: string;
  tone: string;
  language: string;
  greeting_message: string;
  instructions: string;
  channels: string[];
  quick_replies?: string[];
  stages?: Array<{ id: string; name: string; description: string; example: string }>;
  selected_features?: string[];
  onboarding_level?: string;
}

interface AgentChatPanelProps {
  onBack: () => void;
  agentType: AgentType;
  agentName: string;
  agentAvatar: string;
  wizardStep: "discover" | "structure" | "build" | "done";
  setWizardStep: (step: "discover" | "structure" | "build" | "done") => void;
  structuredConfig: StructuredAgentConfig | null;
  setStructuredConfig: (config: StructuredAgentConfig | null) => void;
  chatMode: "setup" | "test" | "voice";
  setChatMode: (mode: "setup" | "test" | "voice") => void;
  hasApiKey: boolean;
  hasAnyLLMKey: boolean;
  keysLoading: boolean;
  currentProvider: string;
  agentModel: string;
  availableModels: Array<{ value: string; label: string; provider: string; badge?: "free" | "byok" | "byok-anthropic"; locked?: boolean }>;
  setupModel: string;
  setSetupModel: (model: string) => void;
  setAgentModel: (model: string) => void;
  gatewayModels: ReadonlyArray<{ value: string; label: string }>;
  onGoToIntegrations: () => void;
  onConfigStructured: (config: StructuredAgentConfig) => void;
  onAgentCreated: (config: StructuredAgentConfig) => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isStreaming: boolean;
  onStructureRequest: (description: string) => Promise<StructuredAgentConfig | null>;
  onBuildAgent: (config: StructuredAgentConfig) => Promise<void>;
  isStructuring: boolean;
  isBuilding: boolean;
  onOpenConfig?: () => void;
  initialPrompt?: string;
  initialWizardMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  onWizardMessagesChange?: (messages: Array<{ role: "user" | "assistant"; content: string }>) => void;
  hasMemoryActive?: boolean;
  /** Wizard chat (Q&A flow with backend wizard prompt) — used during the discover step. */
  wizardMessages?: ChatMessage[];
  wizardSendMessage?: (text: string) => void;
  wizardIsStreaming?: boolean;
}

const AGENT_SUGGESTIONS: Record<string, string[]> = {
  SDR: [
    "Agente SDR para qualificação de leads B2B via WhatsApp",
    "SDR que coleta nome, email e interesse e agenda reunião",
    "Qualificador BANT automático com encaminhamento para closers",
  ],
  BDR: [
    "Agente BDR para prospecção outbound de empresas SaaS",
    "Prospectador que pesquisa empresas e personaliza abordagem",
    "BDR que identifica decisores e agenda reuniões qualificadas",
  ],
  SAC: [
    "Agente de suporte ao cliente para e-commerce",
    "SAC que resolve dúvidas e escala para humanos quando necessário",
    "Suporte técnico com diagnóstico e abertura de chamados",
  ],
  CS: [
    "Agente de Customer Success para onboarding de clientes",
    "CS que acompanha uso do produto e previne churn",
    "Consultor de sucesso com health check periódico",
  ],
  Custom: [
    "Agente de qualificação de leads",
    "Agente criador de conteúdo para redes sociais",
    "Agente de atendimento ao cliente",
  ],
};

const stepLabels = [
  { id: "discover" as const, label: "Descobrir", num: 1 },
  { id: "structure" as const, label: "Estruturar", num: 2 },
  { id: "build" as const, label: "Construir", num: 3 },
];

const toneLabels: Record<string, string> = {
  professional_friendly: "Profissional e Amigável",
  formal: "Formal",
  casual: "Casual e Descontraído",
  empathetic: "Empático e Acolhedor",
  direct: "Direto e Objetivo",
};

const onboardingLabels: Record<string, string> = {
  none: "Nenhum",
  soft: "Suave",
  strict: "Rigoroso",
};

const typeLabel: Record<string, string> = {
  SDR: "SDR", BDR: "BDR", SAC: "SAC", CS: "Customer Success", Custom: "personalizado",
};

const AgentChatPanel = ({
  onBack,
  agentType,
  agentName,
  agentAvatar,
  wizardStep,
  setWizardStep,
  structuredConfig,
  setStructuredConfig,
  chatMode,
  setChatMode,
  hasApiKey,
  hasAnyLLMKey,
  keysLoading,
  currentProvider,
  agentModel,
  availableModels,
  setupModel,
  setSetupModel,
  setAgentModel,
  gatewayModels,
  onGoToIntegrations,
  onConfigStructured,
  onAgentCreated,
  messages,
  sendMessage,
  isStreaming,
  onStructureRequest,
  onBuildAgent,
  isStructuring,
  isBuilding,
  onOpenConfig,
  initialPrompt,
  initialWizardMessages,
  onWizardMessagesChange,
  hasMemoryActive,
  wizardMessages: wizardChatMessages,
  wizardSendMessage,
  wizardIsStreaming,
}: AgentChatPanelProps) => {
  const [input, setInput] = useState("");
  const [editingConfig, setEditingConfig] = useState(false);
  const [wizardMessages, setWizardMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(() => initialWizardMessages || []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialPromptUsedRef = useRef(false);
  const handleDiscoverRef = useRef<(text: string) => Promise<void>>(async () => {});

  // ── Audio recording via SpeechRecognition ──
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recordedTextRef = useRef("");

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      // Stop and send transcribed text
      stopRecording();
      const text = recordedTextRef.current.trim();
      recordedTextRef.current = "";
      if (text) {
        if (wizardStep === "discover" && text.length >= 10) {
          handleDiscoverRef.current(text);
        } else if (wizardStep === "done") {
          sendMessage(text);
        } else {
          setInput(prev => (prev + " " + text).trim());
        }
      } else {
        toast.info("Nenhuma fala detectada. Tente novamente.");
      }
      return;
    }

    // Start recording
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    recordedTextRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      recordedTextRef.current = (finalText + interim).trim();
      setInput(recordedTextRef.current);
    };

    recognition.onerror = (event: any) => {
      console.warn("SpeechRecognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permissão de microfone negada. Habilite nas configurações do navegador.");
      }
      stopRecording();
    };

    recognition.onend = () => {
      // Finalize
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch (e) {
      toast.error("Erro ao iniciar gravação de áudio.");
    }
  }, [isRecording, stopRecording, wizardStep, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, wizardMessages, isStructuring, isBuilding]);

  const selectedModelInfo = availableModels.find(m => m.value === agentModel);
  const isSelectedModelFree = selectedModelInfo?.badge === "free";
  const isSelectedModelLocked = selectedModelInfo?.locked === true;
  const canSendTest = chatMode === "test" ? (isSelectedModelFree || !isSelectedModelLocked) : true;
  const isDiscoverEmpty = wizardStep === "discover" && (wizardChatMessages?.length ?? 0) === 0 && !wizardIsStreaming;
  const suggestions = AGENT_SUGGESTIONS[agentType] || AGENT_SUGGESTIONS.Custom;

  /* ── Discover → Structure ── */
  const handleDiscover = useCallback(async (text: string) => {
    if (text.length < 10) {
      toast.error("Descreva com pelo menos 10 caracteres.");
      return;
    }
    setWizardMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setWizardStep("structure");

    setWizardMessages(prev => [
      ...prev,
      { role: "assistant", content: "🧠 Analisando sua ideia e estruturando o agente..." },
    ]);

    const result = await onStructureRequest(text);

    if (result) {
      setStructuredConfig(result);
      onConfigStructured(result);
      setWizardMessages(prev => {
        const filtered = prev.filter(m => m.content !== "🧠 Analisando sua ideia e estruturando o agente...");
        return [
          ...filtered,
          { role: "assistant", content: `✅ Estrutura definida para **${result.agent_name}**!\n\nRevise a configuração abaixo e clique em **Construir** quando estiver pronto.` },
        ];
      });
    } else {
      toast.error("Erro ao estruturar. Tente novamente.");
      setWizardStep("discover");
      setWizardMessages(prev => prev.filter(m => m.content !== "🧠 Analisando sua ideia e estruturando o agente..."));
    }
  }, [onStructureRequest, setStructuredConfig, onConfigStructured, setWizardStep]);

  // Keep ref in sync for auto-trigger
  handleDiscoverRef.current = handleDiscover;

  useEffect(() => {
    if (wizardMessages.length === 0 && initialWizardMessages?.length) {
      setWizardMessages(initialWizardMessages);
    }
  }, [initialWizardMessages, wizardMessages.length]);

  useEffect(() => {
    onWizardMessagesChange?.(wizardMessages);
  }, [wizardMessages, onWizardMessagesChange]);

  // Auto-trigger discover when initialPrompt is provided (custom agent from Home)
  useEffect(() => {
    if (initialPrompt && wizardStep === "discover" && !initialPromptUsedRef.current && !isStructuring) {
      initialPromptUsedRef.current = true;
      void handleDiscoverRef.current(initialPrompt);
    }
  }, [initialPrompt, wizardStep, isStructuring]);

  /* ── Re-structure ── */
  const handleRestructure = useCallback(() => {
    const lastUserMsg = wizardMessages.filter(m => m.role === "user").pop();
    if (lastUserMsg) {
      setStructuredConfig(null);
      setEditingConfig(false);
      handleDiscover(lastUserMsg.content);
    }
  }, [wizardMessages, handleDiscover, setStructuredConfig]);

  /* ── Build ── */
  const handleBuild = useCallback(async () => {
    if (!structuredConfig) return;
    setWizardStep("build");
    await onBuildAgent(structuredConfig);
  }, [structuredConfig, setWizardStep, onBuildAgent]);

  /* ── Send (post-wizard) ── */
  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isStreaming, sendMessage]);

  /* ── Send (during wizard discover — Q&A with backend) ── */
  const handleWizardSend = useCallback(() => {
    const text = input.trim();
    if (!text || wizardIsStreaming || !wizardSendMessage) return;
    wizardSendMessage(text);
    setInput("");
  }, [input, wizardIsStreaming, wizardSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (wizardStep === "discover") {
        handleWizardSend();
      } else if (wizardStep === "done") {
        handleSend();
      }
    }
  };

  // Which messages to show based on wizard state
  // During discover, show the wizard Q&A chat — hide the initial "start" trigger message
  const displayMessages: any[] = wizardStep === "done"
    ? messages
    : wizardStep === "discover"
      ? (wizardChatMessages || []).filter((m, i) => {
          const text = "text" in m ? (m as any).text : (m as any).content;
          const role = "text" in m ? (m as any).role : (m as any).role;
          return !(i === 0 && role === "user" && typeof text === "string" && text.trim().toLowerCase() === "start");
        })
      : wizardMessages;


  return (
    <div className="w-[420px] min-w-[360px] border-r border-border flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Agente de Texto e Voz</span>
        </div>
        <span className="flex-1" />
        <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
          <Bot className="w-3 h-3" />
          {typeLabel[agentType] || agentType}
        </span>
      </div>

      {/* Wizard Stepper */}
      {wizardStep !== "done" && (
        <div className="px-4 py-2.5 border-b border-border bg-card/30">
          <div className="flex items-center gap-1">
            {stepLabels.map((s, i) => {
              const stepOrder = ["discover", "structure", "build"];
              const currentIdx = stepOrder.indexOf(wizardStep);
              const thisIdx = stepOrder.indexOf(s.id);
              const isDone = thisIdx < currentIdx;
              const isActive = s.id === wizardStep;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                      isDone ? "bg-primary text-primary-foreground"
                      : isActive ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? <Check className="w-3 h-3" /> : s.num}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${isDone ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent info bar — only after wizard is done */}
      {wizardStep === "done" && (
        <div className="h-10 border-b border-border flex items-center px-3 gap-2 shrink-0">
          <img src={agentAvatar} className="w-6 h-6 rounded-full object-cover" alt="" />
          <span className="text-xs font-medium truncate">{agentName}</span>
          {hasMemoryActive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary" title="Este agente lembra conversas anteriores">
              <Brain className="w-3 h-3" />
              <span className="text-[9px] font-medium hidden sm:inline">Memória</span>
            </span>
          )}
          <span className="flex-1" />
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setChatMode("setup")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${chatMode === "setup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Configurar
            </button>
            <button
              onClick={() => setChatMode("test")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${chatMode === "test" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Testar
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* ══ Step 1: Discover — empty state (waiting for backend first question) ══ */}
        {isDiscoverEmpty && (
          <div className="flex flex-col items-center justify-center h-full pt-12">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">Configurando seu agente</h2>
            <p className="text-xs text-muted-foreground text-center max-w-[280px]">
              Vou te fazer algumas perguntas para criar o seu agente {typeLabel[agentType] || ""} sob medida.
            </p>
            <Loader2 className="w-4 h-4 text-primary animate-spin mt-4" />
          </div>
        )}

        {/* Chat / wizard messages */}
        {displayMessages.map((msg, i) => {
          const text = "text" in msg ? msg.text : msg.content;
          const role = "text" in msg ? msg.role : msg.role === "user" ? "user" : "agent";
          return (
            <div key={i}>
              {role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[90%] text-sm">
                    <p className="whitespace-pre-wrap text-foreground">{text}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="text-sm leading-relaxed text-foreground flex-1 min-w-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ══ Step 2: Structuring — loading state ══ */}
        {isStructuring && (
          <div className="flex items-center gap-3 bg-card/50 border border-border rounded-xl p-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-xs font-medium text-foreground">Estruturando com IA...</p>
              <p className="text-[10px] text-muted-foreground">Analisando descrição e definindo configuração</p>
            </div>
          </div>
        )}

        {/* ══ Step 2: Structured Config Card ══ */}
        {wizardStep === "structure" && structuredConfig && !isStructuring && (
          <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <h3 className="text-xs font-semibold text-foreground">Configuração Estruturada</h3>
              </div>
              <button
                onClick={() => setEditingConfig(!editingConfig)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                {editingConfig ? "Fechar" : "Editar"}
              </button>
            </div>

            {!editingConfig ? (
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="font-medium text-foreground">{structuredConfig.agent_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Tom</span>
                  <span className="font-medium text-foreground">{toneLabels[structuredConfig.tone] || structuredConfig.tone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Idioma</span>
                  <span className="font-medium text-foreground">{structuredConfig.language}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Onboarding</span>
                  <span className="font-medium text-foreground">{onboardingLabels[structuredConfig.onboarding_level || "soft"] || structuredConfig.onboarding_level}</span>
                </div>
                <div className="py-1 border-b border-border/50">
                  <span className="text-muted-foreground block mb-1">Mensagem inicial</span>
                  <span className="text-foreground italic">"{structuredConfig.greeting_message}"</span>
                </div>
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Funcionalidades</span>
                  <div className="flex flex-wrap gap-1">
                    {(structuredConfig.selected_features || []).map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0.5">
                        {f.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nome</label>
                  <Input
                    value={structuredConfig.agent_name}
                    onChange={(e) => setStructuredConfig({ ...structuredConfig, agent_name: e.target.value })}
                    className="h-7 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Tom</label>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(toneLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setStructuredConfig({ ...structuredConfig, tone: key })}
                        className={`px-2 py-1 rounded-md text-[9px] font-medium border transition-all ${
                          structuredConfig.tone === key
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Idioma</label>
                  <div className="flex gap-1">
                    {[["pt-BR", "🇧🇷 PT"], ["en", "🇺🇸 EN"], ["es", "🇪🇸 ES"]].map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setStructuredConfig({ ...structuredConfig, language: k })}
                        className={`px-2 py-1 rounded-md text-[9px] font-medium border transition-all ${
                          structuredConfig.language === k
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Mensagem inicial</label>
                  <textarea
                    value={structuredConfig.greeting_message}
                    onChange={(e) => setStructuredConfig({ ...structuredConfig, greeting_message: e.target.value })}
                    className="w-full bg-background border border-border rounded-md text-xs px-2 py-1.5 min-h-[50px] resize-none outline-none focus:border-primary/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Onboarding</label>
                  <div className="flex gap-1">
                    {(["none", "soft", "strict"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setStructuredConfig({ ...structuredConfig, onboarding_level: v })}
                        className={`flex-1 px-2 py-1 rounded-md text-[9px] font-medium border transition-all ${
                          structuredConfig.onboarding_level === v
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        {onboardingLabels[v]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-lg gap-1" onClick={handleRestructure} disabled={isStructuring}>
                <RotateCw className="w-3 h-3" /> Re-estruturar
              </Button>
              <Button size="sm" className="flex-1 h-8 text-xs rounded-lg gap-1" onClick={handleBuild} disabled={isBuilding}>
                <Sparkles className="w-3 h-3" /> Construir
              </Button>
            </div>
          </div>
        )}

        {/* ══ Step 3: Building indicator ══ */}
        {isBuilding && (
          <div className="flex items-center gap-3 bg-card/50 border border-border rounded-xl p-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-xs font-medium text-foreground">Construindo {structuredConfig?.agent_name || agentName}...</p>
              <p className="text-[10px] text-muted-foreground">Salvando configuração e preparando o agente</p>
            </div>
          </div>
        )}

        {/* ══ Test prompt — shown when agent is ready and in setup mode ══ */}
        {wizardStep === "done" && chatMode === "setup" && !isBuilding && !isStreaming && messages.length <= 2 && (
          <div className="bg-card/50 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Agente pronto! 🎉</p>
                <p className="text-[10px] text-muted-foreground">Teste seu agente antes de publicar</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seu agente foi configurado com sucesso. Agora você pode testá-lo em tempo real para verificar se as respostas estão de acordo com o esperado.
            </p>
            <Button
              size="sm"
              className="w-full h-8 text-xs rounded-lg gap-1.5"
              onClick={() => setChatMode("test")}
            >
              <Bot className="w-3.5 h-3.5" /> Testar agente agora
            </Button>
          </div>
        )}

        {/* Streaming indicator (post-wizard or during wizard Q&A) */}
        {((wizardStep === "done" && isStreaming && messages[messages.length - 1]?.role !== "agent") ||
          (wizardStep === "discover" && wizardIsStreaming && (wizardChatMessages?.[wizardChatMessages.length - 1]?.role !== "agent"))) && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs">Pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border shrink-0">
        {chatMode === "test" && !keysLoading && wizardStep === "done" && isSelectedModelLocked && (
          <div className="mb-2 text-xs text-destructive flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              O modelo <strong>{selectedModelInfo?.label}</strong> requer chave de API própria.{" "}
              <button className="underline font-medium" onClick={onGoToIntegrations}>Configurar em Integrações</button>
            </span>
          </div>
        )}
        {chatMode === "test" && !keysLoading && wizardStep === "done" && hasAnyLLMKey && availableModels.length > 0 && (() => {
          const grouped = new Map<string, typeof availableModels>();
          const providerLabels: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", google: "Google", meta: "Meta", deepseek: "DeepSeek", mistral: "Mistral", gemini: "Google" };
          for (const m of availableModels) {
            const key = m.provider;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(m);
          }
          const selectedModel = availableModels.find(m => m.value === agentModel);
          return (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Modelo:</span>
              <div className="relative flex-1 max-w-[240px]">
                <select
                  value={agentModel}
                  onChange={e => {
                    const model = availableModels.find(m => m.value === e.target.value);
                    if (model?.locked) {
                      toast.info("Adicione sua chave de API em Integrações para usar este modelo", {
                        action: { label: "Configurar", onClick: onGoToIntegrations },
                      });
                    }
                    setAgentModel(e.target.value);
                  }}
                  className="text-xs h-7 w-full rounded-md border border-input bg-background px-2 py-0.5 text-foreground outline-none focus:ring-1 focus:ring-ring appearance-none pr-6"
                >
                  {Array.from(grouped.entries()).map(([provider, models]) => (
                    <optgroup key={provider} label={providerLabels[provider] || provider}>
                      {models.map(m => (
                        <option key={m.value} value={m.value}>
                          {m.locked ? "🔒 " : ""}{m.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
              {selectedModel?.locked && (
                <Lock className="h-3 w-3 text-muted-foreground opacity-60 shrink-0" />
              )}
            </div>
          );
        })()}
        <div className={`rounded-xl border border-border bg-card/50 p-1 transition-colors ${
          (wizardStep === "done" || wizardStep === "discover") ? "focus-within:border-primary/30" : "opacity-60"
        }`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              wizardStep === "discover"
                ? "Digite sua resposta..."
                : wizardStep === "done"
                ? (chatMode === "setup" ? "Descreva o que quer ajustar..." : "Envie uma mensagem de teste...")
                : "Complete as etapas acima para começar..."
            }
            rows={2}
            disabled={
              isStructuring || isBuilding ||
              (wizardStep === "done" && isStreaming) ||
              (wizardStep === "discover" && !!wizardIsStreaming) ||
              (wizardStep !== "done" && wizardStep !== "discover") ||
              (wizardStep === "done" && chatMode === "test" && !canSendTest)
            }
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[36px] max-h-[120px] disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-1">
              <button
                onClick={handleMicClick}
                className={`transition-colors p-1 rounded ${
                  isRecording
                    ? "text-destructive animate-pulse bg-destructive/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                disabled={isStreaming || isStructuring || isBuilding}
                title={isRecording ? "Clique para parar e enviar" : "Clique para gravar áudio"}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button
              size="icon"
              onClick={wizardStep === "discover" ? handleWizardSend : handleSend}
              disabled={
                !input.trim() ||
                isStructuring || isBuilding ||
                (wizardStep === "discover" && !!wizardIsStreaming) ||
                (wizardStep === "done" && isStreaming) ||
                (wizardStep === "done" && chatMode === "test" && !canSendTest) ||
                (wizardStep !== "done" && wizardStep !== "discover")
              }
              className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChatPanel;
