import {
  BusinessContext,
  KnowledgeFile,
  AgentIntent,
  MANDATORY_INTENTS,
  CUSTOM_INTENT_SUGGESTIONS,
  ConversationStage,
  DEFAULT_CONVERSATION_STAGES,
  AgentAdvancedConfig,
  DEFAULT_ADVANCED_CONFIG,
  MessageSize,
  CreativityLevel,
} from "@/types/agent-builder";
import { MOCK_CLIENTS } from "@/types/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, ArrowLeft, User, Target, MessageSquare, Layers, BookOpen, Settings2,
  Upload, X, FileText, Image, File, Plus, Check, GripVertical, Trash2, ChevronDown, ChevronUp,
  Shield, AlertTriangle, ArrowRightLeft, Ban, Clock, Volume2, Sparkles, Mic,
} from "lucide-react";
import { useState, useRef } from "react";

interface Props {
  context: BusinessContext;
  onChange: (ctx: BusinessContext) => void;
  onNext: () => void;
  onBack: () => void;
  advancedConfig: AgentAdvancedConfig;
  onAdvancedConfigChange: (cfg: AgentAdvancedConfig) => void;
  intents: AgentIntent[];
  onIntentsChange: (intents: AgentIntent[]) => void;
  stages: ConversationStage[];
  onStagesChange: (stages: ConversationStage[]) => void;
}

type Section = "identidade" | "objetivo" | "intencoes" | "estagios" | "conhecimento" | "avancado";

const SECTIONS: { key: Section; label: string; icon: typeof User }[] = [
  { key: "identidade", label: "Identidade", icon: User },
  { key: "objetivo", label: "Objetivo", icon: Target },
  { key: "intencoes", label: "Intenções", icon: MessageSquare },
  { key: "estagios", label: "Estágios", icon: Layers },
  { key: "conhecimento", label: "Conhecimento", icon: BookOpen },
  { key: "avancado", label: "Avançado", icon: Settings2 },
];

const TONES = [
  "Profissional e amigável",
  "Formal e corporativo",
  "Casual e descontraído",
  "Consultivo e técnico",
  "Empático e acolhedor",
];

const COMM_STYLES = [
  "Respostas curtas e diretas",
  "Respostas detalhadas e explicativas",
  "Tom consultivo com perguntas",
  "Conversacional e natural",
];

const ELEVENLABS_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", style: "Feminina, suave e natural" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", style: "Feminina, profissional" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", style: "Feminina, amigável" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", style: "Feminina, confiante" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", style: "Feminina, jovem" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", style: "Feminina, calorosa" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", style: "Masculina, profissional" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", style: "Masculina, amigável" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", style: "Masculina, madura" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", style: "Masculina, jovem" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", style: "Masculina, grave" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", style: "Masculina, confiante" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", style: "Masculina, versátil" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", style: "Masculina, casual" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", style: "Masculina, dinâmica" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", style: "Masculina, clara" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", style: "Neutra, moderna" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", style: "Masculina, narradora" },
];

const INDUSTRIES = [
  "Tecnologia", "SaaS", "E-commerce", "Marketing Digital", "Consultoria",
  "Educação", "Saúde", "Financeiro", "Imobiliário", "Varejo", "Outro",
];

const INTENT_ICONS: Record<string, typeof Shield> = {
  end_conversation: Ban,
  transfer_human: ArrowRightLeft,
  invalid_content: AlertTriangle,
  response_limit: Clock,
};

const StepContext = ({
  context, onChange, onNext, onBack,
  advancedConfig, onAdvancedConfigChange,
  intents, onIntentsChange,
  stages, onStagesChange,
}: Props) => {
  const [activeSection, setActiveSection] = useState<Section>("identidade");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedIntent, setExpandedIntent] = useState<string | null>(null);
  const [newIntentName, setNewIntentName] = useState("");
  const [newIntentAction, setNewIntentAction] = useState("");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");

  const update = (field: keyof BusinessContext, value: string) =>
    onChange({ ...context, [field]: value });

  // File handling
  const handleFiles = (files: FileList) => {
    const newFiles: KnowledgeFile[] = Array.from(files)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type }));
    onChange({ ...context, knowledgeFiles: [...context.knowledgeFiles, ...newFiles] });
  };

  const removeFile = (id: string) =>
    onChange({ ...context, knowledgeFiles: context.knowledgeFiles.filter((f) => f.id !== id) });

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4 text-primary shrink-0" />;
    if (type === "application/pdf") return <FileText className="w-4 h-4 text-destructive shrink-0" />;
    return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Intent helpers
  const customIntents = intents.filter((i) => !i.isMandatory);
  const canAddIntent = customIntents.length < 10;

  const addCustomIntent = () => {
    if (!newIntentName.trim() || !canAddIntent) return;
    const newIntent: AgentIntent = {
      id: crypto.randomUUID(),
      name: newIntentName.trim(),
      description: "",
      triggers: [],
      action: newIntentAction.trim() || newIntentName.trim(),
      isMandatory: false,
    };
    onIntentsChange([...intents, newIntent]);
    setNewIntentName("");
    setNewIntentAction("");
  };

  const addSuggestedIntent = (suggestion: { name: string; action: string }) => {
    if (!canAddIntent || intents.some((i) => i.name === suggestion.name)) return;
    const newIntent: AgentIntent = {
      id: crypto.randomUUID(),
      name: suggestion.name,
      description: "",
      triggers: [],
      action: suggestion.action,
      isMandatory: false,
    };
    onIntentsChange([...intents, newIntent]);
  };

  const removeIntent = (id: string) =>
    onIntentsChange(intents.filter((i) => i.id !== id));

  // Stage helpers
  const canAddStage = stages.length < 10;

  const addStage = () => {
    if (!newStageName.trim() || !canAddStage) return;
    const newStage: ConversationStage = {
      id: crypto.randomUUID(),
      name: newStageName.trim(),
      description: "",
      example: "",
      order: stages.length + 1,
    };
    onStagesChange([...stages, newStage]);
    setNewStageName("");
  };

  const removeStage = (id: string) => {
    const filtered = stages.filter((s) => s.id !== id);
    onStagesChange(filtered.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveStage = (id: string, direction: "up" | "down") => {
    const idx = stages.findIndex((s) => s.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === stages.length - 1)) return;
    const newStages = [...stages];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newStages[idx], newStages[swapIdx]] = [newStages[swapIdx], newStages[idx]];
    onStagesChange(newStages.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStage = (id: string, field: keyof ConversationStage, value: string) => {
    onStagesChange(stages.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Configure seu agente</h2>
        <p className="text-sm text-muted-foreground">Preencha as seções para criar um agente funcional em minutos.</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── 1. Identidade do Agente ── */}
      {activeSection === "identidade" && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="agentName">Nome do agente *</Label>
                <Input id="agentName" placeholder="Ex: Ivy, Sofia, Max..." value={context.agentName} onChange={(e) => update("agentName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo / Função</Label>
                <Input placeholder="Ex: SDR, Atendente, Consultor..." value={context.mainProduct} onChange={(e) => update("mainProduct", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Empresa que representa *</Label>
              <Select
                value={context.companyName ? MOCK_CLIENTS.find(c => c.companyName === context.companyName)?.id || "" : ""}
                onValueChange={(clientId) => {
                  const client = MOCK_CLIENTS.find(c => c.id === clientId);
                  if (client) {
                    onChange({
                      ...context,
                      companyName: client.companyName,
                      website: client.website ? `https://${client.website}` : "",
                      industry: INDUSTRIES.includes(client.industry) ? client.industry : client.industry || "",
                    });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Escolha um cliente cadastrado" /></SelectTrigger>
                <SelectContent>
                  {MOCK_CLIENTS.filter(c => c.status === "active" || c.status === "onboarding").map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{c.initials}</div>
                        <span>{c.companyName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {context.companyName && (
                <p className="text-xs text-muted-foreground mt-1">
                  {context.companyName} — {context.industry || "Sem indústria"} — {context.website || "Sem website"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de voz (ElevenLabs)</Label>
              <Select value={context.businessHours} onValueChange={(v) => update("businessHours", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione uma voz" /></SelectTrigger>
                <SelectContent>
                  {ELEVENLABS_VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-primary" />
                        <span>{v.name}</span>
                        <span className="text-[10px] text-muted-foreground">— {v.style}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Voz utilizada quando o agente responde em áudio.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tom de voz *</Label>
                <Select value={context.toneOfVoice} onValueChange={(v) => update("toneOfVoice", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estilo de comunicação</Label>
                <Select value={context.escalationRules || COMM_STYLES[0]} onValueChange={(v) => update("escalationRules", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMM_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="greeting">Mensagem de saudação</Label>
              <Textarea
                id="greeting"
                placeholder="Ex: Olá! 👋 Sou a Ivy, assistente virtual da empresa X. Como posso te ajudar?"
                value={context.greetingMessage}
                onChange={(e) => update("greetingMessage", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-4 py-3">
            <strong>Exemplo:</strong> Nome: Ivy · Função: SDR · Objetivo: Qualificar leads e agendar reuniões · Tom: profissional, humano e consultivo · Estilo: respostas curtas e diretas
          </div>
        </div>
      )}

      {/* ── 2. Objetivo do Agente ── */}
      {activeSection === "objetivo" && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatDoes">O que este agente faz? *</Label>
              <Textarea
                id="whatDoes"
                placeholder="Ex: Este agente conversa com visitantes do site para entender seu interesse, qualificar o lead e agendar uma reunião com o time comercial."
                value={context.targetAudienceDescription}
                onChange={(e) => update("targetAudienceDescription", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedResult">Qual o resultado esperado da conversa?</Label>
              <Textarea
                id="expectedResult"
                placeholder="Ex: Lead qualificado com reunião agendada, ticket resolvido, proposta enviada..."
                value={context.painPoints}
                onChange={(e) => update("painPoints", e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audience">Quem é o público atendido?</Label>
              <Textarea
                id="audience"
                placeholder="Ex: PMEs de tecnologia, decisores C-level, clientes existentes com dúvidas..."
                value={context.knowledgeSources}
                onChange={(e) => update("knowledgeSources", e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Intenções ── */}
      {activeSection === "intencoes" && (
        <div className="space-y-4 animate-fade-in">
          {/* Mandatory intents */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intenções obrigatórias</p>
            <div className="space-y-2">
              {MANDATORY_INTENTS.map((intent) => {
                const Icon = INTENT_ICONS[intent.id] || Shield;
                const isExpanded = expandedIntent === intent.id;
                return (
                  <div key={intent.id} className="rounded-lg border border-border bg-muted/20">
                    <button
                      onClick={() => setExpandedIntent(isExpanded ? null : intent.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{intent.name}</span>
                          <Badge variant="outline" className="text-[9px]">Obrigatória</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{intent.description}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Quando ativar:</Label>
                          <div className="flex flex-wrap gap-1">
                            {intent.triggers.map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Ação:</Label>
                          <p className="text-xs text-foreground">{intent.action}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom intents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intenções personalizadas</p>
              <span className="text-[10px] text-muted-foreground">{customIntents.length}/10</span>
            </div>

            {customIntents.length > 0 && (
              <div className="space-y-2">
                {customIntents.map((intent) => (
                  <div key={intent.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{intent.name}</p>
                      <p className="text-[11px] text-muted-foreground">{intent.action}</p>
                    </div>
                    <button onClick={() => removeIntent(intent.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">Sugestões rápidas:</Label>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_INTENT_SUGGESTIONS.filter((s) => !intents.some((i) => i.name === s.name)).map((s) => (
                  <button
                    key={s.name}
                    onClick={() => addSuggestedIntent(s)}
                    disabled={!canAddIntent}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all disabled:opacity-50"
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Add custom */}
            {canAddIntent && (
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Nome da intenção"
                  value={newIntentName}
                  onChange={(e) => setNewIntentName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Ação"
                  value={newIntentAction}
                  onChange={(e) => setNewIntentAction(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={addCustomIntent} disabled={!newIntentName.trim()} className="gap-1 shrink-0">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Estágios da Conversa ── */}
      {activeSection === "estagios" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">A IA seguirá esta ordem durante a conversa. Arraste para reordenar.</p>
            <span className="text-[10px] text-muted-foreground">{stages.length}/10 estágios</span>
          </div>

          <div className="space-y-2">
            {stages.map((stage, idx) => {
              const isExpanded = expandedStage === stage.id;
              return (
                <div key={stage.id} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <button onClick={() => setExpandedStage(isExpanded ? null : stage.id)} className="flex-1 text-left">
                      <span className="text-sm font-medium text-foreground">{stage.name}</span>
                      {stage.description && <p className="text-[11px] text-muted-foreground truncate">{stage.description}</p>}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveStage(stage.id, "up")} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveStage(stage.id, "down")} disabled={idx === stages.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeStage(stage.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Descrição</Label>
                        <Input value={stage.description} onChange={(e) => updateStage(stage.id, "description", e.target.value)} placeholder="O que o agente faz neste estágio?" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Exemplo de mensagem</Label>
                        <Textarea value={stage.example} onChange={(e) => updateStage(stage.id, "example", e.target.value)} placeholder="Como o agente se comunica neste estágio?" rows={2} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {canAddStage && (
            <div className="flex gap-2">
              <Input
                placeholder="Nome do novo estágio..."
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStage(); } }}
              />
              <Button size="sm" onClick={addStage} disabled={!newStageName.trim()} className="gap-1 shrink-0">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Base de Conhecimento ── */}
      {activeSection === "conhecimento" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Conecte fontes de conhecimento para alimentar o agente.</p>
            <Badge variant="outline" className="text-[10px]">
              {context.knowledgeFiles.length} base{context.knowledgeFiles.length !== 1 ? "s" : ""} conectada{context.knowledgeFiles.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">Arraste arquivos ou clique para enviar</p>
            <p className="text-[11px] text-muted-foreground mt-1">PDFs, documentos, websites, FAQ, Notion, Google Drive</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Máx. 10MB por arquivo</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
          />

          {context.knowledgeFiles.length > 0 && (
            <div className="space-y-1.5">
              {context.knowledgeFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                  {getFileIcon(file.type)}
                  <span className="flex-1 truncate text-foreground">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
                  <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {context.knowledgeFiles.length === 0 && (
            <div className="text-center py-4 border border-dashed border-border rounded-lg">
              <p className="text-xs text-muted-foreground/70">0 bases conectadas — Nenhuma base conectada</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="faq">URL do FAQ ou Central de Ajuda</Label>
            <Input id="faq" placeholder="https://suaempresa.com/faq" value={context.faqUrl} onChange={(e) => update("faqUrl", e.target.value)} />
          </div>
        </div>
      )}

      {/* ── 6. Configurações Avançadas ── */}
      {activeSection === "avancado" && (
        <div className="space-y-5 animate-fade-in">
          {/* Max responses */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Número máximo de respostas</Label>
                <p className="text-[11px] text-muted-foreground">Evita loops de conversa.</p>
              </div>
              <Badge variant="outline" className="text-sm font-mono">{advancedConfig.maxResponses}</Badge>
            </div>
            <Slider
              value={[advancedConfig.maxResponses]}
              onValueChange={([v]) => onAdvancedConfigChange({ ...advancedConfig, maxResponses: v })}
              min={10}
              max={100}
              step={5}
            />
          </div>

          {/* Message size */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Label className="text-sm font-medium">Tamanho das mensagens</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "short" as MessageSize, label: "Curtas", desc: "~200 caracteres" },
                { value: "medium" as MessageSize, label: "Médias", desc: "~600 caracteres" },
                { value: "long" as MessageSize, label: "Longas", desc: "~1200 caracteres" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onAdvancedConfigChange({ ...advancedConfig, messageSize: opt.value })}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    advancedConfig.messageSize === opt.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Min response time */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Tempo mínimo para resposta</Label>
                <p className="text-[11px] text-muted-foreground">Consolida múltiplas mensagens do usuário.</p>
              </div>
              <Badge variant="outline" className="text-sm font-mono">{advancedConfig.minResponseTime}s</Badge>
            </div>
            <Slider
              value={[advancedConfig.minResponseTime]}
              onValueChange={([v]) => onAdvancedConfigChange({ ...advancedConfig, minResponseTime: v })}
              min={0}
              max={30}
              step={1}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Responder na transferência</Label>
                <p className="text-[11px] text-muted-foreground">Envia resposta imediata ao receber chat transferido.</p>
              </div>
              <Switch
                checked={advancedConfig.respondOnTransfer}
                onCheckedChange={(v) => onAdvancedConfigChange({ ...advancedConfig, respondOnTransfer: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Responder em áudio</Label>
                  <p className="text-[11px] text-muted-foreground">Permite respostas em áudio em determinados contextos.</p>
                </div>
              </div>
              <Switch
                checked={advancedConfig.respondInAudio}
                onCheckedChange={(v) => onAdvancedConfigChange({ ...advancedConfig, respondInAudio: v })}
              />
            </div>
          </div>

          {/* Creativity */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Label className="text-sm font-medium">Criatividade das respostas</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "none" as CreativityLevel, label: "Sem criatividade", desc: "100% baseado no treinamento" },
                { value: "restricted" as CreativityLevel, label: "Restrito", desc: "Prioriza treinamento" },
                { value: "creative" as CreativityLevel, label: "Criativo", desc: "Respostas mais variadas" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onAdvancedConfigChange({ ...advancedConfig, creativity: opt.value })}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    advancedConfig.creativity === opt.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StepContext;
