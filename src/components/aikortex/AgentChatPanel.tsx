import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, ArrowUp, Send, AlertTriangle, Square,
  Sparkles, Bot, Mic, MicOff, Check, Loader2, Pencil, RotateCw, Brain, Lock, ChevronDown,
  Settings2, EyeOff, Paperclip, FileText as FileIcon,
} from "lucide-react";
import { ensureDefaultKb, uploadKbFile } from "@/hooks/use-agent-knowledge-bases";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RichMarkdown from "@/components/aikortex/RichMarkdown";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/use-agent-chat";
import type { AgentType } from "@/types/agent-builder";
import WizardThinkingCard from "@/components/aikortex/WizardThinkingCard";
import InlineOAuthButton from "@/components/aikortex/InlineOAuthButton";
import { avatarImgClass } from "@/lib/agent-avatar";

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
  /** Agent ID — necessário pra upload de arquivos pra Conhecimento Base */
  agentId?: string;
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
  /** Interromper geração — clicar no botão stop enquanto IA está respondendo */
  stopStreaming?: () => void;
  wizardStopStreaming?: () => void;
  /** Toggle for "Ver/Esconder configuração" during discover (replaces FAB). */
  showConfigToggle?: boolean;
  configPanelVisible?: boolean;
  onToggleConfigPanel?: () => void;
  /** Saved config (live polling) for derived progress checklist. */
  savedConfig?: Record<string, any> | null;
}

// Module-level set pra dedupe de initialPrompt entre mounts (StrictMode em
// dev faz mount->cleanup->mount; refs do componente sao recriados, mas isto
// sobrevive. Chave = initialPrompt + agentId pra nao colidir entre agentes).
const triggeredPrompts = new Set<string>();

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

// Master v7.4 §13.16 — mapping de tool name → label visível em cards inline
const TOOL_LABELS: Record<string, string> = {
  set_niche: "Nicho",
  set_company_name: "Empresa",
  set_agent_name: "Nome",
  set_agent_description: "Descrição",
  set_agent_type: "Tipo",
  set_avatar: "Avatar",
  set_tone_of_voice: "Tom",
  set_objective: "Objetivo",
  set_instructions: "Instruções",
  set_greeting_message: "Saudação",
  set_capability: "Capacidade",
  set_channel: "Canal",
  add_tool: "Tool",
  request_external_integration: "Integração",
  commit_draft: "Concluído",
};

interface ToolExecuted { name: string; log: string }

const extractToolsMarker = (text: string): { clean: string; tools: ToolExecuted[] } => {
  const match = text.match(/<!--tools:(\[.*?\])-->/s);
  if (!match) return { clean: text, tools: [] };
  try {
    const tools = JSON.parse(match[1]) as ToolExecuted[];
    return { clean: text.replace(/\n*<!--tools:\[.*?\]-->/s, "").trim(), tools };
  } catch {
    return { clean: text, tools: [] };
  }
};

// Extrai marcadores OAuth do texto (ex: <!--oauth:google_calendar-->) pra
// renderizar inline o botão Solutions Architect. Suporta múltiplos no mesmo balão.
const extractOAuthMarkers = (text: string): { clean: string; oauths: string[] } => {
  const oauths: string[] = [];
  const clean = text.replace(/<!--oauth:([a-z_]+)-->/g, (_, key) => {
    oauths.push(key);
    return "";
  }).trim();
  return { clean, oauths };
};

const AgentChatPanel = ({
  onBack,
  agentId,
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
  stopStreaming,
  wizardStopStreaming,
  showConfigToggle,
  configPanelVisible,
  onToggleConfigPanel,
  savedConfig,
}: AgentChatPanelProps) => {
  const [input, setInput] = useState("");
  const [editingConfig, setEditingConfig] = useState(false);
  const [wizardMessages, setWizardMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(() => initialWizardMessages || []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialPromptUsedRef = useRef(false);
  const handleDiscoverRef = useRef<(text: string) => Promise<void>>(async () => {});

  // ── File upload pra Knowledge Base inline no chat ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  const handleAttachClick = useCallback(() => {
    if (!agentId) {
      toast.error("Aguardando carregar o agente — tenta de novo em um instante.");
      return;
    }
    fileInputRef.current?.click();
  }, [agentId]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo depois
    if (!file || !agentId) return;
    setUploadingFile(file.name);
    try {
      // 1. Garante uma KB padrão pro agente
      const { id: kbId } = await ensureDefaultKb(agentId);
      // 2. Upload pro Storage (kb-files)
      const { storage_path } = await uploadKbFile(agentId, file);
      // 3. Dispara ingestão (chunk + embedding + insert)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      const resp = await fetch(fnUrl("ingest-document"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kb_id: kbId, source_type: "file", title: file.name, storage_path }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const result = await resp.json() as { chunks_count: number };
      // 4. Mensagem de confirmação no chat (não chama o LLM — só append visual)
      const confirmMsg = `📎 Adicionei **${file.name}** à base de conhecimento (${result.chunks_count} trechos indexados). Posso usar esse conteúdo nas respostas.`;
      if (wizardStep === "discover") {
        setWizardMessages((prev) => [...prev, { role: "assistant", content: confirmMsg }]);
      } else if (sendMessage) {
        // No modo done/setup, manda via sendMessage como assistant simulado
        // (frontend já trata role assistant pra renderizar).
        // Simplificação: usa toast e não polui o chat.
      }
      toast.success(`${file.name} indexado (${result.chunks_count} trechos)`);
    } catch (err) {
      console.error("[upload]", err);
      toast.error(`Falha no upload: ${(err as Error).message}`);
    } finally {
      setUploadingFile(null);
    }
  }, [agentId, wizardStep, sendMessage]);

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

  // Scroll automático — dispara sempre que:
  // - array de mensagens muda (nova msg)
  // - conteúdo da ÚLTIMA mensagem muda (streaming chunk-by-chunk)
  // - estado de loading muda
  const lastMessageContent = messages[messages.length - 1]?.text ?? "";
  const lastWizardContent = wizardMessages[wizardMessages.length - 1]?.content ?? "";
  useEffect(() => {
    if (scrollRef.current) {
      // requestAnimationFrame garante que rola depois do paint
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages.length, wizardMessages.length, lastMessageContent, lastWizardContent, isStructuring, isBuilding, isStreaming, wizardIsStreaming]);

  // Auto-focus do input quando o user pode digitar (não streaming, não loading)
  const canType =
    !isStructuring && !isBuilding &&
    !(wizardStep === "done" && isStreaming) &&
    !(wizardStep === "discover" && wizardIsStreaming) &&
    (wizardStep === "done" || wizardStep === "discover");

  useEffect(() => {
    // Foca quando passa pra "pode digitar" (após streaming/loading terminar)
    if (canType && inputRef.current) {
      // Pequeno delay garante que o textarea está renderizado e clicável
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
      return () => clearTimeout(t);
    }
  }, [canType, messages.length, wizardMessages.length]);

  const selectedModelInfo = availableModels.find(m => m.value === agentModel);
  const isSelectedModelFree = selectedModelInfo?.badge === "free";
  const isSelectedModelLocked = selectedModelInfo?.locked === true;
  const canSendTest = chatMode === "test" ? (isSelectedModelFree || !isSelectedModelLocked) : true;
  // Hero state removido — saudação inicial do bot já é o ponto de entrada.

  // Modo Vibe ONE-SHOT: user dá UMA descrição livre, não há Q&A.
  // Quick-replies só fariam sentido em fluxo de entrevista — desativadas.
  const quickReplies: string[] = [];

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

  // Auto-trigger quando initialPrompt vier da Home (ex.: Stark texto/voz).
  // CRITICO: usa wizardSendMessage (mesmo caminho do user digitando no input)
  // em vez de handleDiscover. handleDiscover pula direto pra step "structure";
  // wizardSendMessage mantem a conversa multi-turn em "discover" — o wizard
  // faz as perguntas certas antes de estruturar, igual quando o user clica
  // "Novo Agente" e digita a primeira solicitacao.
  //
  // GUARD ANTI-DUPLICACAO: alem do useRef, checa se ja existe mensagem do
  // usuario em wizardChatMessages. Em StrictMode (Lovable usa em dev) o
  // componente monta/desmonta/remonta — useRef volta pro inicial e a guarda
  // padrao falha. A checagem em wizardChatMessages sobrevive ao remount.
  useEffect(() => {
    if (!initialPrompt) return;
    if (wizardStep !== "discover") return;
    if (initialPromptUsedRef.current) return;
    if (wizardIsStreaming) return;
    if (!wizardSendMessage) return;
    // Set module-level sobrevive a StrictMode mount/unmount/mount. Chave inclui
    // o texto exato pra nunca mandar 2x o mesmo prompt nem que a UI rerenderize.
    if (triggeredPrompts.has(initialPrompt)) {
      initialPromptUsedRef.current = true;
      return;
    }
    // Tambem checa se ja existe esse texto exato como msg do user (caso muito
    // dificil: page reload com prompt remontado).
    const promptAlreadyInChat = (wizardChatMessages || []).some(
      (m: any) => m.role === "user" && (m.text || m.content || "").trim() === initialPrompt.trim()
    );
    if (promptAlreadyInChat) {
      triggeredPrompts.add(initialPrompt);
      initialPromptUsedRef.current = true;
      return;
    }
    console.log("[wizard-trigger] DISPARANDO wizardSendMessage:", initialPrompt);
    triggeredPrompts.add(initialPrompt);
    initialPromptUsedRef.current = true;
    wizardSendMessage(initialPrompt);
  }, [initialPrompt, wizardStep, wizardIsStreaming, wizardSendMessage, wizardChatMessages]);

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

  // Which messages to show based on wizard state.
  // During discover, mostra a conversa wizard inteira — só esconde a mensagem
  // "start" sintética que o frontend manda pra disparar o backend.
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
    <div className="w-full h-full flex flex-col bg-background min-w-0">
      {/* Header — Voltar + (toggle painel) + Configurar/Testar (quando done).
          Antes tinha um badge 'SAC/SDR/etc' redundante (agent_type ja aparece
          em outros lugares). Os tabs Configurar/Testar tambem estavam num
          info bar separado abaixo — consolidado aqui pra UX mais limpa. */}
      <div className="h-12 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs font-medium border-border hover:border-primary/40 hover:bg-card"
          onClick={onBack}
          title="Voltar para a lista de agentes"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </Button>
        <span className="flex-1" />
        {showConfigToggle && (
          <button
            type="button"
            onClick={onToggleConfigPanel}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border border-border bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
            title={configPanelVisible ? "Esconder painel de configuração" : "Ver configuração sendo construída"}
          >
            {configPanelVisible ? <EyeOff className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
            {configPanelVisible ? "Esconder configuração" : "Ver configuração"}
          </button>
        )}
        {wizardStep === "done" && (
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setChatMode("setup")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${chatMode === "setup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Configurar
            </button>
            <button
              onClick={() => setChatMode("test")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${chatMode === "test" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Testar
            </button>
          </div>
        )}
      </div>

      {/* Wizard checklist (Master v7.4 §13.2 — 4 blocos). Em desktop o
          WizardShowcasePanel à direita já mostra o progresso com mais
          destaque; aqui esconde no lg+ pra evitar redundância. */}
      {wizardStep === "discover" && (() => {
        const cfg = savedConfig || {};
        const ctx = (cfg as any).businessContext || {};
        const checkpoints = [
          { id: "profile", label: "Perfil", done: !!(ctx.companyName && ctx.niche && cfg.name && cfg.name !== "Novo Agente") },
          { id: "tone", label: "Tom & objetivo", done: !!(cfg.toneOfVoice && cfg.objective) },
          { id: "channels", label: "Canais", done: Array.isArray(cfg.channels) && cfg.channels.length > 0 },
          { id: "criteria", label: "Critérios", done: !!(cfg.instructions && cfg.instructions.length > 80) },
          { id: "flow", label: "Saudação", done: !!cfg.greetingMessage },
        ];
        const doneCount = checkpoints.filter(c => c.done).length;
        const pct = Math.round((doneCount / checkpoints.length) * 100);
        return (
          <div className="lg:hidden px-4 py-3 border-b border-border bg-gradient-to-b from-card/40 to-card/10">
            <div className="max-w-3xl mx-auto w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Construindo agente · <span className="text-foreground">{doneCount}/{checkpoints.length}</span>
                </span>
                <span className="text-[11px] font-semibold text-primary">{pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {checkpoints.map((c) => (
                  <span
                    key={c.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                      c.done
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted/40 text-muted-foreground border border-border/50"
                    }`}
                  >
                    {c.done ? <Check className="w-2.5 h-2.5" /> : <span className="w-2.5 h-2.5 rounded-full border border-current opacity-50" />}
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stepper antigo só pra structure/build (já validados, simples) */}
      {(wizardStep === "structure" || wizardStep === "build") && (
        <div className="px-4 py-2.5 border-b border-border bg-card/30">
          <div className="flex items-center gap-1 max-w-3xl mx-auto w-full">
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

      {/* Info bar — só mostra quando ha algo relevante (STAGING ou Memoria).
          Avatar+nome do agente removidos (ja aparecem no header do painel
          direito). Tabs Configurar/Testar movidos pro header principal. */}
      {wizardStep === "done" && (chatMode === "test" || hasMemoryActive) && (
        <div className={`h-9 border-b flex items-center px-3 gap-2 shrink-0 transition-colors duration-300 ${
          chatMode === "test"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border"
        }`}>
          {chatMode === "test" && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400" title="Ambiente de simulação — mensagens não são enviadas a clientes reais">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] font-bold tracking-widest">TESTANDO</span>
            </span>
          )}
          {hasMemoryActive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary" title="Este agente lembra conversas anteriores">
              <Brain className="w-3 h-3" />
              <span className="text-[9px] font-medium hidden sm:inline">Memória</span>
            </span>
          )}
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-3xl mx-auto w-full space-y-4">

        {/* Hero state removido — fluxo agora é puramente conversacional desde
            a primeira mensagem do bot, como na Master v7.4 §13.2 (Modo Vibe). */}

        {/* Chat / wizard messages */}
        {displayMessages.map((msg, i) => {
          const rawText = "text" in msg ? msg.text : msg.content;
          const role = "text" in msg ? msg.role : msg.role === "user" ? "user" : "agent";
          // Extrai 2 tipos de markers: tools (já existia) + oauths (novo) pro
          // bot pedir conexão Google inline no chat (Solutions Architect).
          const { clean: textWithOauths, tools } = role === "agent" ? extractToolsMarker(rawText || "") : { clean: rawText, tools: [] };
          const { clean: text, oauths } = role === "agent" ? extractOAuthMarkers(textWithOauths) : { clean: textWithOauths, oauths: [] };
          return (
            <div key={i}>
              {role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm">
                    <p className="whitespace-pre-wrap text-foreground">{text}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  {wizardStep === "discover" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-primary/20">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-border">
                      <img src={agentAvatar} alt={agentName} className={avatarImgClass(agentAvatar)} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="text-sm text-foreground bg-card/30 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
                      <RichMarkdown>{text}</RichMarkdown>
                    </div>
                    {/* Master v7.4 §13.16: cards inline de tools aplicadas */}
                    {tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-1">
                        {tools.map((t, idx) => (
                          <div
                            key={`${i}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium"
                          >
                            <Check className="w-3 h-3 shrink-0" />
                            <span className="text-muted-foreground/80">{TOOL_LABELS[t.name] || t.name}:</span>
                            <span className="truncate max-w-[180px]">{t.log.replace(/^.*?:\s*/, "")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Botões OAuth inline (Solutions Architect) — quando o bot
                        detecta integração faltando, marker <!--oauth:X--> dispara o botão. */}
                    {oauths.length > 0 && (
                      <div className="flex flex-wrap gap-2 ml-1 mt-1">
                        {oauths.map((scope) => (
                          <InlineOAuthButton
                            key={`${i}-oauth-${scope}`}
                            scope={scope as any}
                            onConnected={() => {
                              // User conectou! Avisa o wizard pra prosseguir
                              if (wizardSendMessage) {
                                setTimeout(() => wizardSendMessage("pronto, conectei agora"), 600);
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
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

        {/* Wizard thinking card durante discover — mostra o processo REAL
            baseado em savedConfig atualizado por polling rápido. */}
        {wizardStep === "discover" && wizardIsStreaming && (wizardChatMessages?.[wizardChatMessages.length - 1]?.role !== "agent") && (
          <WizardThinkingCard savedConfig={savedConfig} />
        )}

        {/* Streaming dots simples pra modo Testar/Configurar (pós-wizard) */}
        {wizardStep === "done" && isStreaming && messages[messages.length - 1]?.role !== "agent" && (
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
      </div>

      {/* Quick-reply chips (Master v7.4 §13.2: campos com domínio fechado) */}
      {quickReplies.length > 0 && wizardSendMessage && (
        <div className="px-4 pb-2 shrink-0">
          <div className="max-w-3xl mx-auto w-full flex flex-wrap gap-1.5">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => wizardSendMessage(reply)}
                disabled={wizardIsStreaming}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/5 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="max-w-3xl mx-auto w-full">
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
            ref={inputRef}
            autoFocus
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
                onClick={handleAttachClick}
                className={`transition-colors p-1 rounded ${
                  uploadingFile
                    ? "text-primary animate-pulse"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                disabled={isStreaming || isStructuring || isBuilding || !!uploadingFile || !agentId}
                title={
                  !agentId
                    ? "Aguardando carregar o agente"
                    : uploadingFile
                    ? `Indexando ${uploadingFile}...`
                    : "Anexar PDF, DOCX, TXT ou MD (envia pra Conhecimento)"
                }
              >
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={handleFileSelected}
              />
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
            {(() => {
              // Botão de stop quando IA está streamando, send quando ocioso
              const streaming = wizardStep === "discover" ? !!wizardIsStreaming : isStreaming;
              const canStop = streaming && (wizardStep === "discover" ? !!wizardStopStreaming : !!stopStreaming);
              if (canStop) {
                return (
                  <Button
                    size="icon"
                    onClick={() => (wizardStep === "discover" ? wizardStopStreaming?.() : stopStreaming?.())}
                    className="h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90"
                    title="Interromper geração"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </Button>
                );
              }
              return (
                <Button
                  size="icon"
                  onClick={wizardStep === "discover" ? handleWizardSend : handleSend}
                  disabled={
                    !input.trim() ||
                    isStructuring || isBuilding ||
                    (wizardStep === "done" && chatMode === "test" && !canSendTest) ||
                    (wizardStep !== "done" && wizardStep !== "discover")
                  }
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
              );
            })()}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChatPanel;
