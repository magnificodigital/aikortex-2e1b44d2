import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp, Bot, ChevronDown, ChevronLeft, Mic, Wrench,
  CheckCircle2, AlertCircle, ChevronUp, FileCode, Sparkles,
  Phone, Monitor, Check, Loader2, Pencil, RotateCw,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useAppBuilder, type ChatMessage, type StructuredAppConfig, type AppState } from "@/contexts/AppBuilderContext";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

interface ToolLog {
  label: string;
  status: "success" | "error";
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-chat`;

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

/* ── Robust JSON extraction ── */

function extractJson(raw: string): any {
  // Strip markdown code fences
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, "").replace(/\n?```\s*$/gm, "").trim();
  // Remove control characters (except newlines/tabs)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned);
}

function validateAppState(obj: any): AppState | null {
  const state = obj?.app_state || obj;
  if (!state?.app_meta && !state?.preview) return null;
  // Ensure required top-level fields exist with defaults
  return {
    app_meta: state.app_meta || { type: "web", name: "App", description: "", tone: "", language: "pt-BR", status: "draft" },
    preview: state.preview || { type: "web", title: "", subtitle: "", layout: {}, screen_data: {}, interactions: [] },
    agent_config: state.agent_config || { intro_message: "", max_turn_messages: 2, onboarding_level: "soft", personality_rules: [], conversation_rules: [], cta_primary: "", quick_replies: [] },
    flows: state.flows || [],
    database: state.database || { tables: [] },
    files: state.files || [],
    ui_modules: state.ui_modules || [],
    runtime: state.runtime || { render_ready: true, mocked: true, warnings: [], next_build_targets: [] },
  } as AppState;
}

/* ── API request (non-streaming) ── */

async function requestAppState(
  messages: Msg[],
  appContext: Record<string, string>,
  mode: string,
): Promise<{ appState: AppState | null; chatSummary: string; error?: string }> {
  const accessToken = await getAuthToken();
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messages, appContext, mode }),
  });
  if (resp.status === 429) return { appState: null, chatSummary: "", error: "Limite de requisições excedido." };
  if (resp.status === 402) return { appState: null, chatSummary: "", error: "Créditos insuficientes." };
  if (!resp.ok) return { appState: null, chatSummary: "", error: "Erro no serviço de IA" };

  const data = await resp.json();
  if (data.error) return { appState: null, chatSummary: "", error: data.error };

  try {
    const raw = typeof data.appStateRaw === "string" ? extractJson(data.appStateRaw) : data.appStateRaw;
    const state = validateAppState(raw);
    if (!state) {
      console.error("Invalid app_state schema:", raw);
      return { appState: null, chatSummary: "", error: "Resposta da IA não contém um app_state válido." };
    }
    const summary = raw?.chat_summary || "";
    return { appState: state, chatSummary: summary };
  } catch (e) {
    console.error("JSON parse error:", e, data.appStateRaw?.slice?.(0, 200));
    return { appState: null, chatSummary: "", error: "Erro ao processar resposta da IA" };
  }
}

async function requestStructure(description: string, appType: string, language: string): Promise<StructuredAppConfig | null> {
  const accessToken = await getAuthToken();
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: description }],
      appContext: { app_type: appType, language },
      mode: "structure",
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  try {
    const raw = typeof data.structuredConfig === "string" ? extractJson(data.structuredConfig) : data.structuredConfig;
    return raw as StructuredAppConfig;
  } catch {
    return null;
  }
}

/* ── Component ── */

interface ChatPanelProps {
  onBack: () => void;
  initialPrompt?: string;
}

const ChatPanel = ({ onBack, initialPrompt }: ChatPanelProps) => {
  const {
    channel, initializeProject, addTerminalLog,
    setIsGenerating, setAppName, setWizardConfig, setAppState,
    chatMessages, setChatMessages,
    wizardStep, setWizardStep,
    wizardData: ctxWizardData, setWizardData: setCtxWizardData,
    structuredConfig, setStructuredConfig, appState,
  } = useAppBuilder();

  const messagesRef = useRef(chatMessages);
  messagesRef.current = chatMessages;
  const setMessages = useCallback((update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (typeof update === "function") {
      setChatMessages(update(messagesRef.current));
    } else {
      setChatMessages(update);
    }
  }, [setChatMessages]);
  const messages = chatMessages;

  const wizardData = ctxWizardData;
  const setWizardData = (updater: ((prev: typeof ctxWizardData) => typeof ctxWizardData) | typeof ctxWizardData) => {
    if (typeof updater === "function") {
      setCtxWizardData(updater(ctxWizardData));
    } else {
      setCtxWizardData(updater);
    }
  };

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolsUsed, setToolsUsed] = useState(0);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [toolLogs, setToolLogs] = useState<ToolLog[]>([]);
  const [structuring, setStructuring] = useState(false);
  const [building, setBuilding] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const initializedProject = useRef(false);

  useEffect(() => {
    if (wizardStep === "done" && chatMessages.length > 0) {
      initializedProject.current = true;
      sentInitial.current = true;
    }
  }, []);

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      setWizardData(prev => ({ ...prev, prompt: initialPrompt }));
      setMessages([{ role: "user", content: initialPrompt }]);
      handleStructure(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, structuring]);

  /* ── Step 1: Discovery → Step 2: Structuring ── */

  const handleDiscover = () => {
    if (wizardData.prompt.length < 10) {
      toast.error("Descreva com pelo menos 10 caracteres.");
      return;
    }
    setMessages(prev => [
      ...prev,
      { role: "user", content: wizardData.prompt },
    ]);
    handleStructure(wizardData.prompt);
  };

  /* ── Step 2: AI Structuring ── */

  const handleStructure = async (description: string) => {
    setWizardStep("structure");
    setStructuring(true);
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "🧠 Analisando sua ideia e estruturando o app..." },
    ]);

    const result = await requestStructure(description, channel, wizardData.language || "pt-BR");

    if (result) {
      setStructuredConfig(result);
      setWizardData(prev => ({
        ...prev,
        appName: result.app_name || prev.appName,
        prompt: result.app_description || prev.prompt,
        tone: result.tone || prev.tone,
        language: result.language || prev.language,
        introMessage: result.intro_message || prev.introMessage,
        maxMessages: result.max_turn_messages || prev.maxMessages,
        onboarding: (result.onboarding_level as "none" | "soft" | "strict") || prev.onboarding,
        selectedFeatures: result.selected_features || prev.selectedFeatures,
        businessContext: result.business_context || prev.businessContext,
        constraints: result.constraints || prev.constraints,
      }));
      setAppName(result.app_name || "Meu App");

      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== "🧠 Analisando sua ideia e estruturando o app...");
        return [
          ...filtered,
          { role: "assistant", content: `✅ Estrutura definida para **${result.app_name}**!\n\nRevise a configuração abaixo e clique em **Construir** quando estiver pronto.` },
        ];
      });
    } else {
      toast.error("Erro ao estruturar. Tente novamente.");
      setWizardStep("discover");
      setMessages(prev => prev.filter(m => m.content !== "🧠 Analisando sua ideia e estruturando o app..."));
    }
    setStructuring(false);
  };

  /* ── Step 3: Build ── */

  const handleBuild = async () => {
    if (!structuredConfig) return;
    setWizardStep("build");
    setBuilding(true);
    setIsGenerating(true);

    setWizardConfig({
      prompt: wizardData.prompt,
      companyName: wizardData.companyName,
      appName: structuredConfig.app_name,
      tone: structuredConfig.tone,
      language: structuredConfig.language,
      introMessage: structuredConfig.intro_message,
      maxMessages: structuredConfig.max_turn_messages,
      onboarding: (structuredConfig.onboarding_level as "none" | "soft" | "strict") || "soft",
      selectedFeatures: structuredConfig.selected_features || [],
      businessContext: structuredConfig.business_context || "",
      constraints: structuredConfig.constraints || "",
    });

    const formatFeature = (f: string) => f.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const featuresFormatted = (structuredConfig.selected_features || []).map(formatFeature).join(", ");
    const buildLoadingMessage = `🚀 **Iniciando construção de ${structuredConfig.app_name}**\n\nCanal: ${channel === "whatsapp" ? "WhatsApp" : "Web App"} · Tom: ${toneLabels[structuredConfig.tone] || structuredConfig.tone} · Idioma: ${structuredConfig.language}\n\nFuncionalidades: ${featuresFormatted}\n\nGerando app state...`;

    setMessages(prev => [...prev, { role: "assistant", content: buildLoadingMessage }]);

    if (!initializedProject.current) {
      initializedProject.current = true;
      initializeProject(channel, wizardData.prompt);
    }

    setToolsUsed(p => p + 1);
    setToolLogs(prev => [...prev, { label: "Gerando estado do app...", status: "success" }]);
    addTerminalLog({ text: "$ aikortex build --mode=create", type: "command", timestamp: Date.now() });

    const contextPrompt = `Crie um ${channel === "whatsapp" ? "WhatsApp App" : "Web App"} chamado "${structuredConfig.app_name}".
Descrição: ${structuredConfig.app_description}
Tom: ${structuredConfig.tone}
Idioma: ${structuredConfig.language}
Mensagem de introdução: ${structuredConfig.intro_message}
Máx mensagens por turno: ${structuredConfig.max_turn_messages}
Onboarding: ${structuredConfig.onboarding_level}
Funcionalidades: ${(structuredConfig.selected_features || []).join(", ")}
${structuredConfig.business_context ? `Contexto: ${structuredConfig.business_context}` : ""}
${structuredConfig.constraints ? `Restrições: ${structuredConfig.constraints}` : ""}`;

    const sc = structuredConfig;
    const appContext: Record<string, string> = {
      app_type: channel,
      app_name: sc.app_name || "Meu App",
      app_description: sc.app_description || wizardData.prompt || "",
      tone: sc.tone || "professional_friendly",
      language: sc.language || "pt-BR",
      intro_message: sc.intro_message || "",
      max_turn_messages: String(sc.max_turn_messages || 2),
      onboarding_level: sc.onboarding_level || "soft",
      selected_features: (sc.selected_features || []).join(", "),
      business_context: sc.business_context || "",
      constraints: sc.constraints || "",
      is_patch: "false",
    };

    const { appState: newState, chatSummary, error } = await requestAppState(
      [{ role: "user", content: contextPrompt }],
      appContext,
      "build",
    );

    if (error) {
      toast.error(error);
      setToolLogs(prev => [...prev, { label: error, status: "error" }]);
      addTerminalLog({ text: `✗ ${error}`, type: "error", timestamp: Date.now() });
      setMessages(prev => [
        ...prev.filter(m => m.content !== buildLoadingMessage),
        { role: "assistant", content: `❌ ${error}` },
      ]);
      setBuilding(false);
      setIsGenerating(false);
      return;
    }

    if (newState) {
      setAppState(newState);
      setBuilding(false);
      setIsGenerating(false);
      setWizardStep("done");

      const filesCount = newState.files?.length || 0;
      const tablesCount = newState.database?.tables?.length || 0;
      setToolLogs(prev => [
        ...prev,
        { label: `${filesCount} arquivo(s) gerado(s)`, status: "success" },
        { label: `${tablesCount} tabela(s) criada(s)`, status: "success" },
      ]);
      addTerminalLog({ text: `✓ ${filesCount} arquivos gerados`, type: "success", timestamp: Date.now() });
      addTerminalLog({ text: `✓ ${tablesCount} tabelas criadas`, type: "success", timestamp: Date.now() });
      addTerminalLog({ text: "✓ Preview atualizado", type: "success", timestamp: Date.now() });
      addTerminalLog({ text: "✓ Dashboard atualizado", type: "success", timestamp: Date.now() });

      const summary = chatSummary || `✅ **${newState.app_meta?.name || sc.app_name}** criado com sucesso!\n\nO preview e o dashboard já foram atualizados.`;
      setMessages(prev => [
        ...prev.filter(m => m.content !== buildLoadingMessage),
        { role: "assistant", content: summary },
      ]);
      return;
    }

    setBuilding(false);
    setIsGenerating(false);
  };

  /* ── Send message (patch mode) ── */

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setIsLoading(true);
    setIsGenerating(true);
    setToolsUsed(p => p + 1);

    if (!initializedProject.current) {
      initializedProject.current = true;
      initializeProject(channel, text.trim());
    }

    setToolLogs(prev => [...prev, { label: `Processando: "${text.trim().slice(0, 40)}..."`, status: "success" }]);
    addTerminalLog({ text: "$ aikortex patch", type: "command", timestamp: Date.now() });

    const sc = structuredConfig;
    const appContext: Record<string, string> = {
      app_type: channel,
      app_name: sc?.app_name || wizardData.appName || "Meu App",
      app_description: sc?.app_description || wizardData.prompt || "",
      tone: sc?.tone || wizardData.tone || "professional_friendly",
      language: sc?.language || wizardData.language || "pt-BR",
      intro_message: sc?.intro_message || wizardData.introMessage || "",
      max_turn_messages: String(sc?.max_turn_messages || wizardData.maxMessages || 2),
      onboarding_level: sc?.onboarding_level || wizardData.onboarding || "soft",
      selected_features: (sc?.selected_features || wizardData.selectedFeatures || []).join(", "),
      business_context: sc?.business_context || wizardData.businessContext || "",
      constraints: sc?.constraints || wizardData.constraints || "",
      is_patch: "true",
      current_state: appState ? JSON.stringify(appState).slice(0, 4000) : "",
    };

    const { appState: newState, chatSummary, error } = await requestAppState(
      [...messages, userMsg],
      appContext,
      "build",
    );

    if (error) {
      toast.error(error);
      setMessages(p => [...p, { role: "assistant", content: `❌ ${error}` }]);
      setToolLogs(prev => [...prev, { label: error, status: "error" }]);
      addTerminalLog({ text: `✗ ${error}`, type: "error", timestamp: Date.now() });
    } else if (newState) {
      setAppState(newState);
      addTerminalLog({ text: "✓ Atualizado", type: "success", timestamp: Date.now() });
      const summary = chatSummary || "✅ Atualização aplicada! O preview foi atualizado.";
      setMessages(p => [...p, { role: "assistant", content: summary }]);
    }

    setIsLoading(false);
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (wizardStep === "discover") {
        if (input.trim().length >= 10) {
          setWizardData(prev => ({ ...prev, prompt: input.trim() }));
          // Small delay to ensure state is set before handleDiscover reads it
          const text = input.trim();
          setInput("");
          setMessages(prev => [...prev, { role: "user", content: text }]);
          handleStructure(text);
        }
      } else if (wizardStep === "done") {
        sendMessage(input);
      }
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="w-[440px] min-w-[360px] max-w-[520px] border-r border-border flex flex-col bg-card/20">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Studio</span>
          </div>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${
          channel === "whatsapp"
            ? "bg-green-500/10 text-green-500 border border-green-500/20"
            : "bg-primary/10 text-primary border border-primary/20"
        }`}>
          {channel === "whatsapp" ? <WhatsAppIcon className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
          {channel === "whatsapp" ? "WhatsApp" : "Web"}
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

      {/* Tools indicator */}
      {toolsUsed > 0 && (
        <div className="px-3 py-2">
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/30 rounded-lg px-2.5 py-1.5 w-full"
          >
            <Wrench className="w-3 h-3" />
            <span>{toolsUsed} ações</span>
            {toolsExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          {toolsExpanded && toolLogs.length > 0 && (
            <div className="mt-1.5 space-y-0.5 pl-1">
              {toolLogs.slice(-6).map((log, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  {log.status === "success" ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                  )}
                  <span className="text-muted-foreground truncate">{log.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages + Wizard area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* ══ Step 1: Discover ══ */}
        {wizardStep === "discover" && isEmpty && (
          <div className="flex flex-col items-center justify-center h-full pt-12">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">Descreva seu app</h2>
            <p className="text-xs text-muted-foreground text-center max-w-[280px] mb-6">
              {channel === "whatsapp"
                ? "Conte o que seu WhatsApp App deve fazer. A IA vai estruturar tudo automaticamente."
                : "Conte o que seu Web App deve fazer. A IA vai estruturar tudo automaticamente."}
            </p>


            {/* Quick suggestions */}
            <div className="mt-6 w-full max-w-[340px]">
              <p className="text-[10px] text-muted-foreground mb-2 text-center">ou comece com uma ideia:</p>
              <div className="space-y-1.5">
                {(channel === "whatsapp" ? [
                  "Bot de qualificação de leads via WhatsApp",
                  "Sistema de agendamento para clínicas por WhatsApp",
                  "CRM conversacional com follow-up automático",
                  "Onboarding guiado com coleta de dados via chat",
                ] : [
                  "Dashboard de gestão com métricas e relatórios",
                  "Sistema de cadastro de clientes com CRM visual",
                  "Plataforma de agendamento com calendário interativo",
                  "Painel administrativo com controle de equipe e tarefas",
                ]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setWizardData(prev => ({ ...prev, prompt: s })); setInput(s); }}
                    className="w-full text-left text-[11px] px-3 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((m, i) => {
          if (m.role === "assistant" && !m.content) return null;
          return (
            <div key={i}>
              {m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[90%] text-sm">
                    <p className="whitespace-pre-wrap text-foreground">{m.content}</p>
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
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ══ Step 2: Structuring — loading state ══ */}
        {structuring && (
          <div className="flex items-center gap-3 bg-card/50 border border-border rounded-xl p-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-xs font-medium text-foreground">Estruturando com IA...</p>
              <p className="text-[10px] text-muted-foreground">Analisando descrição e definindo arquitetura</p>
            </div>
          </div>
        )}

        {/* ══ Step 2: Structured Config Card ══ */}
        {wizardStep === "structure" && structuredConfig && !structuring && (
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
                  <span className="font-medium text-foreground">{structuredConfig.app_name}</span>
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
                  <span className="font-medium text-foreground">{onboardingLabels[structuredConfig.onboarding_level] || structuredConfig.onboarding_level}</span>
                </div>
                <div className="py-1 border-b border-border/50">
                  <span className="text-muted-foreground block mb-1">Mensagem inicial</span>
                  <span className="text-foreground italic">"{structuredConfig.intro_message}"</span>
                </div>
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Funcionalidades</span>
                  <div className="flex flex-wrap gap-1">
                    {(structuredConfig.selected_features || []).map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0.5">{f.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nome</label>
                  <Input
                    value={structuredConfig.app_name}
                    onChange={(e) => setStructuredConfig({ ...structuredConfig, app_name: e.target.value })}
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
                    value={structuredConfig.intro_message}
                    onChange={(e) => setStructuredConfig({ ...structuredConfig, intro_message: e.target.value })}
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
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs rounded-lg gap-1"
                onClick={() => handleStructure(wizardData.prompt)}
              >
                <RotateCw className="w-3 h-3" />
                Re-estruturar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs rounded-lg gap-1"
                onClick={handleBuild}
              >
                <Sparkles className="w-3 h-3" />
                Construir
              </Button>
            </div>
          </div>
        )}

        {/* ══ Step 3: Building indicator ══ */}
        {building && (
          <div className="flex items-center gap-3 bg-card/50 border border-border rounded-xl p-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-xs font-medium text-foreground">Construindo {wizardData.appName}...</p>
              <p className="text-[10px] text-muted-foreground">
                {channel === "whatsapp" ? "Gerando fluxos, agentes e estado do app" : "Gerando páginas, componentes e estado do app"}
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
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
              <span className="text-xs">Construindo...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input - only active after wizard is done (patch mode) */}
      <div className="p-3 border-t border-border">
        <div className={`rounded-xl border border-border bg-card/50 p-1 transition-colors ${(wizardStep === "done" || wizardStep === "discover") ? "focus-within:border-primary/30" : "opacity-60"}`}>
          <textarea
            value={wizardStep === "discover" ? (input || wizardData.prompt) : input}
            onChange={(e) => {
              if (wizardStep === "discover") {
                setInput(e.target.value);
                setWizardData(prev => ({ ...prev, prompt: e.target.value }));
              } else {
                setInput(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={wizardStep === "discover"
              ? (channel === "whatsapp"
                ? "Ex: Um bot de qualificação de leads que coleta nome, email e interesse via WhatsApp..."
                : "Ex: Um painel de gestão com dashboard de métricas, cadastro de clientes e relatórios...")
              : wizardStep === "done"
                ? "Peça alterações... (modo patch)"
                : "Complete as etapas acima para começar..."}
            rows={2}
            disabled={wizardStep !== "done" && wizardStep !== "discover"}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[36px] max-h-[120px] disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-1">
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" disabled={wizardStep !== "done" && wizardStep !== "discover"}>
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>
            {wizardStep === "discover" ? (
              <Button
                size="sm"
                onClick={handleDiscover}
                disabled={wizardData.prompt.length < 10 || structuring}
                className="h-8 rounded-full bg-primary hover:bg-primary/90 gap-1.5 text-xs px-4"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Estruturar com IA
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || wizardStep !== "done"}
                className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
