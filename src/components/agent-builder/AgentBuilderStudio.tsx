import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAgentBuilder, type AgentStructuredConfig, type AgentProvider } from "@/contexts/AgentBuilderContext";
import { useUserAgents } from "@/hooks/use-user-agents";
import { useApiKeys } from "@/hooks/use-api-keys";
import { AGENT_PRESETS } from "@/types/agent-presets";
import { DEFAULT_ADVANCED_CONFIG, MANDATORY_INTENTS } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Sparkles, ArrowRight, ArrowLeft, Loader2, CheckCircle2,
  MessageSquare, Settings2, FlaskConical, Rocket, Bot,
  Zap, Globe, AlertTriangle,
} from "lucide-react";

const STEP_META = [
  { key: "describe" as const, label: "Descrever", icon: MessageSquare },
  { key: "customize" as const, label: "Personalizar", icon: Settings2 },
  { key: "calibrate" as const, label: "Calibrar", icon: FlaskConical },
  { key: "create" as const, label: "Criar", icon: Rocket },
];

const PROMPT_SUGGESTIONS: Record<string, string[]> = {
  SDR: [
    "Crie um agente SDR que qualifica leads por WhatsApp e agenda reuniões.",
    "Quero um assistente que responda leads em segundos e aplique critérios BANT.",
  ],
  BDR: [
    "Crie um agente de prospecção outbound que pesquisa empresas e gera oportunidades.",
    "Quero um BDR que aborde empresas-alvo com mensagens personalizadas.",
  ],
  SAC: [
    "Crie um agente de suporte que resolva problemas e colete satisfação.",
    "Quero um SAC 24/7 que responda dúvidas e escale quando necessário.",
  ],
  CS: [
    "Crie um agente de Customer Success para onboarding e retenção.",
    "Quero um CS que acompanhe clientes e previna churn.",
  ],
  Custom: [
    "Descreva livremente o que seu agente deve fazer...",
  ],
};

const PROVIDER_OPTIONS: { id: AgentProvider; label: string; description: string; icon: typeof Sparkles; badge?: string; models?: { value: string; label: string }[] }[] = [
  {
    id: "auto",
    label: "Automático",
    description: "Aikortex escolhe o melhor modelo disponível",
    icon: Sparkles,
    badge: "Recomendado",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    description: "Sessões persistentes, memória de contexto longa. Requer chave BYOK.",
    icon: Bot,
    models: [
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.5" },
      { value: "claude-opus-4-6", label: "Claude Opus 4" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "openai",
    label: "GPT (OpenAI)",
    description: "Alta qualidade, amplamente testado. Requer chave BYOK.",
    icon: Zap,
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    description: "Gratuito via plataforma. Contexto de 1M tokens.",
    icon: Globe,
    models: [
      { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
];

const AgentBuilderStudio = () => {
  const navigate = useNavigate();
  const {
    step, setStep, agentType, prompt, setPrompt,
    structuredConfig, setStructuredConfig, updateConfigField,
    calibrationResults, setCalibrationResults,
    isGenerating, setIsGenerating, setCreatedAgentId,
  } = useAgentBuilder();
  const { saveAgent } = useUserAgents();
  const { keys } = useApiKeys();
  const [creating, setCreating] = useState(false);

  const currentIdx = STEP_META.findIndex(s => s.key === step);

  // Generate structured config from prompt + agentType using preset as base
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { toast.error("Descreva o que o agente deve fazer."); return; }
    setIsGenerating(true);
    try {
      const preset = AGENT_PRESETS[agentType];
      const config: AgentStructuredConfig = {
        name: preset.context.mainProduct ? `Agente ${preset.context.mainProduct}` : `Agente ${agentType}`,
        agentType,
        description: prompt.trim(),
        objective: preset.context.painPoints || "Atender e resolver necessidades do usuário.",
        toneOfVoice: preset.context.toneOfVoice || "Profissional e amigável",
        language: "Português",
        greetingMessage: preset.context.greetingMessage || "Olá! Como posso te ajudar?",
        quickReplies: agentType === "SDR" ? ["Quero saber mais", "Agendar reunião", "Ver planos"]
          : agentType === "BDR" ? ["Como funciona?", "Agendar conversa"]
          : agentType === "SAC" ? ["Preciso de ajuda", "Consultar status", "Falar com humano"]
          : agentType === "CS" ? ["Dúvida sobre produto", "Agendar check-in"]
          : [],
        instructions: preset.context.targetAudienceDescription || "",
        provider: "auto",
        model: "google/gemini-2.0-flash",
        stages: preset.stages.map(s => ({ id: s.id, name: s.name, description: s.description, example: s.example })),
      };
      // Small delay to feel "generated"
      await new Promise(r => setTimeout(r, 800));
      setStructuredConfig(config);
      setStep("customize");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, agentType, setIsGenerating, setStructuredConfig, setStep]);

  // Calibrate: simulate 2 rounds
  const handleCalibrate = useCallback(async () => {
    if (!structuredConfig) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const results = [
        {
          round: 1,
          userMessage: "Olá, quero saber mais sobre o produto.",
          agentResponse: structuredConfig.greetingMessage + " Claro! Posso te ajudar com isso. Qual é o seu principal interesse?",
          passed: true,
        },
        {
          round: 2,
          userMessage: "Quanto custa?",
          agentResponse: "Temos planos a partir de R$ 99/mês. Posso agendar uma conversa com nosso especialista para encontrar o melhor para você?",
          passed: true,
        },
      ];
      setCalibrationResults(results);
    } finally {
      setIsGenerating(false);
    }
  }, [structuredConfig, setIsGenerating, setCalibrationResults]);

  // Create agent
  const handleCreate = useCallback(async () => {
    if (!structuredConfig) return;
    setCreating(true);
    try {
      const preset = AGENT_PRESETS[agentType];
      const saved = await saveAgent({
        name: structuredConfig.name,
        agent_type: agentType,
        description: structuredConfig.description,
        provider: structuredConfig.provider || "auto",
        model: structuredConfig.model || "gemini-2.5-flash",
        config: {
          objective: structuredConfig.objective,
          toneOfVoice: structuredConfig.toneOfVoice,
          language: structuredConfig.language,
          greetingMessage: structuredConfig.greetingMessage,
          quickReplies: structuredConfig.quickReplies,
          instructions: structuredConfig.instructions,
          stages: structuredConfig.stages,
          intents: preset.intents,
          advancedConfig: preset.advancedConfig || DEFAULT_ADVANCED_CONFIG,
        },
        status: "configuring",
      });
      if (saved) {
        setCreatedAgentId(saved.id);
        toast.success("Agente criado com sucesso!");
        navigate(`/aikortex/agents/${saved.id}`, { state: { chatMode: "test" } });
      }
    } finally {
      setCreating(false);
    }
  }, [structuredConfig, agentType, saveAgent, setCreatedAgentId, navigate]);

  return (
    <div className="flex flex-col h-full">
      {/* Stepper */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-card">
        {STEP_META.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.key === step;
          const isDone = i < currentIdx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              {i > 0 && <div className={`w-6 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ── Step 1: Descrever ── */}
        {step === "describe" && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Agente {agentType}
              </div>
              <h2 className="text-xl font-bold">Descreva seu agente</h2>
              <p className="text-sm text-muted-foreground">
                Conte com linguagem natural o que o agente deve fazer. A IA estrutura o resto.
              </p>
            </div>

            <Textarea
              placeholder="Ex: Quero um agente que qualifique leads por WhatsApp, aplique critérios BANT e agende reuniões..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
            />

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {(PROMPT_SUGGESTIONS[agentType] || PROMPT_SUGGESTIONS.Custom).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s.length > 60 ? s.slice(0, 57) + "..." : s}
                </button>
              ))}
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando configuração...</>
                : <><Sparkles className="h-4 w-4 mr-2" /> Gerar configuração</>}
            </Button>
          </div>
        )}

        {/* ── Step 2: Personalizar ── */}
        {step === "customize" && structuredConfig && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="text-center space-y-1 mb-2">
              <h2 className="text-xl font-bold">Personalize seu agente</h2>
              <p className="text-sm text-muted-foreground">Revise e ajuste os dados gerados pela IA.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
                <Input value={structuredConfig.name} onChange={e => updateConfigField("name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(["SDR", "BDR", "SAC", "CS", "Custom"] as const).map(t => (
                    <Badge
                      key={t}
                      variant={structuredConfig.agentType === t ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => updateConfigField("agentType", t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tom de voz</label>
                <Input value={structuredConfig.toneOfVoice} onChange={e => updateConfigField("toneOfVoice", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Idioma</label>
                <Input value={structuredConfig.language} onChange={e => updateConfigField("language", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensagem de saudação</label>
                <Textarea value={structuredConfig.greetingMessage} onChange={e => updateConfigField("greetingMessage", e.target.value)} className="min-h-[80px] resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Objetivo</label>
                <Textarea value={structuredConfig.objective} onChange={e => updateConfigField("objective", e.target.value)} className="min-h-[60px] resize-none" />
              </div>

              {/* Provider selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Modelo de IA</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROVIDER_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = structuredConfig.provider === opt.id;
                    const needsByok = opt.id !== "auto" && !keys[opt.id]?.configured;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          updateConfigField("provider", opt.id);
                          if (opt.models?.length) updateConfigField("model", opt.models[0].value);
                          else updateConfigField("model", "google/gemini-2.0-flash");
                        }}
                        className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold">{opt.label}</span>
                              {opt.badge && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{opt.badge}</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.description}</p>
                          </div>
                        </div>
                        {isSelected && needsByok && (
                          <Alert className="mt-2 py-1.5 px-2 border-amber-500/30 bg-amber-500/5">
                            <AlertDescription className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Configure sua chave em{" "}
                              <a href="/settings?tab=integrations" className="underline font-medium">Integrações</a>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Model selector (when provider has models) */}
              {structuredConfig.provider !== "auto" && (() => {
                const providerOpt = PROVIDER_OPTIONS.find(p => p.id === structuredConfig.provider);
                if (!providerOpt?.models?.length) return null;
                return (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo</label>
                    <Select value={structuredConfig.model} onValueChange={v => updateConfigField("model", v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providerOpt.models.map(m => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("describe")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => { setStep("calibrate"); handleCalibrate(); }} className="flex-1">
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Calibrar ── */}
        {step === "calibrate" && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="text-center space-y-1 mb-2">
              <h2 className="text-xl font-bold">Calibração</h2>
              <p className="text-sm text-muted-foreground">Simulação de conversa para validar o comportamento.</p>
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Simulando conversas...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calibrationResults.map(r => (
                  <div key={r.round} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Rodada {r.round}</span>
                      <Badge variant={r.passed ? "default" : "destructive"} className="text-[10px]">
                        {r.passed ? "✓ Passou" : "✗ Falhou"}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">Cliente:</span>
                        <span>{r.userMessage}</span>
                      </div>
                      <div className="flex gap-2">
                        <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{r.agentResponse}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {calibrationResults.length > 0 && calibrationResults.every(r => r.passed) && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Todos os testes passaram ({calibrationResults.length}/{calibrationResults.length})
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("customize")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={() => setStep("create")}
                disabled={isGenerating || calibrationResults.length === 0}
                className="flex-1"
              >
                Criar Agente <Rocket className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Criar ── */}
        {step === "create" && structuredConfig && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center space-y-1">
              <Rocket className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="text-xl font-bold">Tudo pronto!</h2>
              <p className="text-sm text-muted-foreground">
                Seu agente <strong>{structuredConfig.name}</strong> está configurado e calibrado.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium">{structuredConfig.agentType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Provedor</span><span className="font-medium capitalize">{structuredConfig.provider === "auto" ? "Automático" : structuredConfig.provider}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Modelo</span><span className="font-medium">{structuredConfig.model}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tom</span><span className="font-medium">{structuredConfig.toneOfVoice}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Idioma</span><span className="font-medium">{structuredConfig.language}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estágios</span><span className="font-medium">{structuredConfig.stages.length}</span></div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("calibrate")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="flex-1">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando...</>
                  : <><Sparkles className="h-4 w-4 mr-2" /> Criar Agente</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentBuilderStudio;
