import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, Trash2, PhoneIncoming, PhoneOutgoing,
  Phone, MessageSquare, Webhook,
  Play, Square, AlertTriangle, Loader2, Search, Info,
  ChevronDown, Mic,
} from "lucide-react";
import { useElevenLabsVoices } from "@/hooks/use-elevenlabs-voices";
import PhoneNumberSection from "./PhoneNumberSection";

export interface VoiceConfig {
  agentName: string;
  voiceId: string;
  language: string;
  tone: number;
  speed: number;
  interruptionSensitivity: number;
  maxCallDuration: number;
  waitTime: number;
  endCallOnSilence: number;
  agentSpeaksFirst: boolean;
  openingMessage: string;
  confirmationPhrases: boolean;
  callType: "inbound" | "outbound" | "both";
  phoneNumber: string;
  keywords: string;
  pronunciations: Array<{ word: string; pronunciation: string }>;
  recordCalls: boolean;
  autoTranscription: boolean;
  // Actions
  actionHangupEnabled: boolean;
  actionHangupKeywords: string;
  actionTransferEnabled: boolean;
  actionTransferNumber: string;
  actionSmsEnabled: boolean;
  actionPostSms: string;
  actionWebhookEnabled: boolean;
  actionWebhookUrl: string;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  agentName: "",
  voiceId: "EXAVITQu4vr4xnSDxMaL",
  language: "pt-BR",
  tone: 1.0,
  speed: 1.0,
  interruptionSensitivity: 0.5,
  maxCallDuration: 15,
  waitTime: 30,
  endCallOnSilence: 30,
  agentSpeaksFirst: true,
  openingMessage: "",
  confirmationPhrases: true,
  callType: "inbound",
  phoneNumber: "",
  keywords: "",
  pronunciations: [],
  recordCalls: false,
  autoTranscription: true,
  actionHangupEnabled: false,
  actionHangupKeywords: "",
  actionTransferEnabled: false,
  actionTransferNumber: "",
  actionSmsEnabled: false,
  actionPostSms: "",
  actionWebhookEnabled: false,
  actionWebhookUrl: "",
};

const CATEGORY_LABELS: Record<string, string> = {
  premade: "Padrão",
  cloned: "Clonada",
  generated: "Gerada",
  professional: "Profissional",
};

const LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "Italiano" },
  { value: "ja-JP", label: "日本語" },
  { value: "zh-CN", label: "中文" },
];

interface Props {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
}

const SliderField = ({
  label, value, min, max, step, onChange, hint,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-xs">{label}</Label>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      <span className="text-xs text-muted-foreground font-mono">{value.toFixed(2)}</span>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
  </div>
);

/* ── Collapsible Action Row ── */
const ActionToggle = ({
  icon: Icon, label, enabled, onToggle, children,
}: {
  icon: React.ElementType;
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) => (
  <Collapsible open={enabled}>
    <div className={`rounded-lg border transition-all ${enabled ? "border-primary/30 bg-primary/5" : "border-border bg-card/50"}`}>
      <CollapsibleTrigger asChild>
        <button
          onClick={() => onToggle(!enabled)}
          className="flex items-center justify-between w-full p-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{label}</span>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} onClick={e => e.stopPropagation()} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-border/50">
          {children}
        </div>
      </CollapsibleContent>
    </div>
  </Collapsible>
);

const VoiceConfigPanel = ({ config, onChange }: Props) => {
  const { voices, loading: voicesLoading, hasUserKey, error: voicesError } = useElevenLabsVoices();
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const update = useCallback(<K extends keyof VoiceConfig>(key: K, value: VoiceConfig[K]) => {
    onChange({ ...config, [key]: value });
  }, [config, onChange]);

  const playPreview = (voiceId: string, previewUrl: string | null) => {
    if (playingVoice === voiceId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    if (!previewUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingVoice(voiceId);
    audio.play();
    audio.onended = () => setPlayingVoice(null);
  };

  const filteredVoices = voices.filter(v =>
    v.name.toLowerCase().includes(voiceSearch.toLowerCase())
  );

  const addPronunciation = () => {
    update("pronunciations", [...config.pronunciations, { word: "", pronunciation: "" }]);
  };

  const removePronunciation = (idx: number) => {
    update("pronunciations", config.pronunciations.filter((_, i) => i !== idx));
  };

  const updatePronunciation = (idx: number, field: "word" | "pronunciation", value: string) => {
    const next = [...config.pronunciations];
    next[idx] = { ...next[idx], [field]: value };
    update("pronunciations", next);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">

        {/* ════════════════════════════════════════════════════
            SEÇÃO 1: VOZ
        ════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" /> Voz
          </h3>

          {/* Voice selector grid (from Prompt 1) */}
          {!hasUserKey && !voicesLoading && voices.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Usando vozes padrão da plataforma. Conecte sua conta ElevenLabs em <strong className="text-foreground">Integrações</strong> para acessar suas vozes personalizadas.</span>
            </div>
          )}

          {voicesError && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{voicesError}</span>
            </div>
          )}

          {voicesLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando vozes...
            </div>
          ) : voices.length > 0 ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={voiceSearch}
                  onChange={e => setVoiceSearch(e.target.value)}
                  placeholder="Buscar voz..."
                  className="h-8 text-xs pl-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filteredVoices.map(voice => {
                  const isSelected = config.voiceId === voice.voice_id;
                  const catLabel = CATEGORY_LABELS[voice.category] || voice.category;
                  return (
                    <button
                      key={voice.voice_id}
                      onClick={() => update("voiceId", voice.voice_id)}
                      className={`relative flex flex-col gap-1.5 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-card/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate">{voice.name}</span>
                        {voice.preview_url && (
                          <button
                            onClick={e => { e.stopPropagation(); playPreview(voice.voice_id, voice.preview_url); }}
                            className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                          >
                            {playingVoice === voice.voice_id
                              ? <Square className="w-2.5 h-2.5 text-primary" />
                              : <Play className="w-2.5 h-2.5 text-primary ml-0.5" />}
                          </button>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 w-fit">
                        {catLabel}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              {filteredVoices.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma voz encontrada para "{voiceSearch}"</p>
              )}
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs">Idioma</Label>
            <Select value={config.language} onValueChange={v => update("language", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <SliderField label="Tom de Voz" hint="Estabilidade da voz (ElevenLabs)" value={config.tone} min={0} max={2} step={0.05} onChange={v => update("tone", v)} />
          <SliderField label="Velocidade da Voz" value={config.speed} min={0.5} max={2.0} step={0.05} onChange={v => update("speed", v)} />

          <div className="space-y-1.5">
            <Label className="text-xs">Palavras-chave Otimizadas</Label>
            <Input
              value={config.keywords}
              onChange={e => update("keywords", e.target.value)}
              placeholder="Palavras separadas por vírgula..."
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">Nomes, marcas e termos técnicos para otimizar a transcrição.</p>
          </div>

          {/* Pronúncia Personalizada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pronúncia Personalizada</Label>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={addPronunciation}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {config.pronunciations.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={p.word} onChange={e => updatePronunciation(i, "word", e.target.value)} placeholder="Palavra" className="h-7 text-xs flex-1" />
                <span className="text-xs text-muted-foreground">→</span>
                <Input value={p.pronunciation} onChange={e => updatePronunciation(i, "pronunciation", e.target.value)} placeholder="Pronúncia" className="h-7 text-xs flex-1" />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removePronunciation(i)}>
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            SEÇÃO 2: COMPORTAMENTO
        ════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comportamento</h3>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Quem fala primeiro</Label>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${config.agentSpeaksFirst ? "text-primary font-medium" : "text-muted-foreground"}`}>Agente</span>
              <Switch checked={!config.agentSpeaksFirst} onCheckedChange={v => update("agentSpeaksFirst", !v)} />
              <span className={`text-[10px] ${!config.agentSpeaksFirst ? "text-primary font-medium" : "text-muted-foreground"}`}>Usuário</span>
            </div>
          </div>

          {config.agentSpeaksFirst && (
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem de abertura</Label>
              <Textarea
                value={config.openingMessage}
                onChange={e => update("openingMessage", e.target.value)}
                placeholder="Ex: Olá! Sou a Maia, como posso te ajudar?"
                className="min-h-[50px] text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-xs">Falas de Confirmação</Label>
              <p className="text-[10px] text-muted-foreground">Palavras como "aham", "entendi"</p>
            </div>
            <Switch checked={config.confirmationPhrases} onCheckedChange={v => update("confirmationPhrases", v)} />
          </div>

          <SliderField
            label="Sensibilidade à Interrupção"
            hint="Quão fácil o usuário pode interromper o agente"
            value={config.interruptionSensitivity}
            min={0} max={1} step={0.05}
            onChange={v => update("interruptionSensitivity", v)}
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Encerrar após silêncio</Label>
            <Select value={String(config.endCallOnSilence)} onValueChange={v => update("endCallOnSilence", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 60].map(d => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tempo de Espera com beep</Label>
            <Select value={String(config.waitTime)} onValueChange={v => update("waitTime", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 30, 60].map(d => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            SEÇÃO 3: LIGAÇÃO
        ════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ligação</h3>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <div className="flex gap-2">
              {(["inbound", "outbound", "both"] as const).map(type => (
                <Button
                  key={type}
                  variant={config.callType === type ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={() => update("callType", type)}
                >
                  {type === "inbound" && <PhoneIncoming className="w-3.5 h-3.5" />}
                  {type === "outbound" && <PhoneOutgoing className="w-3.5 h-3.5" />}
                  {type === "both" && <Phone className="w-3.5 h-3.5" />}
                  {type === "inbound" ? "Inbound" : type === "outbound" ? "Outbound" : "Ambos"}
                </Button>
              ))}
            </div>
          </div>

          {/* Phone number selector (from Prompt 2) */}
          <PhoneNumberSection
            selectedNumber={config.phoneNumber}
            onSelect={v => update("phoneNumber", v)}
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Duração Máxima</Label>
            <Select value={String(config.maxCallDuration)} onValueChange={v => update("maxCallDuration", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 30, 60].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-xs">Gravar ligações</Label>
              <p className="text-[10px] text-muted-foreground">Salvar gravações para revisão</p>
            </div>
            <Switch checked={config.recordCalls} onCheckedChange={v => update("recordCalls", v)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-xs">Transcrição automática</Label>
              <p className="text-[10px] text-muted-foreground">Salvar transcrição completa da ligação</p>
            </div>
            <Switch checked={config.autoTranscription} onCheckedChange={v => update("autoTranscription", v)} />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════
            SEÇÃO 4: AÇÕES
        ════════════════════════════════════════════════════ */}
        <section className="space-y-3 pb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</h3>

          <ActionToggle
            icon={Phone}
            label="Encerrar chamada"
            enabled={config.actionHangupEnabled}
            onToggle={v => update("actionHangupEnabled", v)}
          >
            <div className="pt-2 space-y-1.5">
              <Label className="text-[10px]">Palavras-chave que encerram a chamada</Label>
              <Input
                value={config.actionHangupKeywords}
                onChange={e => update("actionHangupKeywords", e.target.value)}
                placeholder="Ex: tchau, encerrar, obrigado"
                className="h-7 text-xs"
              />
            </div>
          </ActionToggle>

          <ActionToggle
            icon={PhoneOutgoing}
            label="Transferir para humano"
            enabled={config.actionTransferEnabled}
            onToggle={v => update("actionTransferEnabled", v)}
          >
            <div className="pt-2 space-y-1.5">
              <Label className="text-[10px]">Número para transferência</Label>
              <Input
                value={config.actionTransferNumber}
                onChange={e => update("actionTransferNumber", e.target.value)}
                placeholder="+55 11 99999-9999"
                className="h-7 text-xs"
              />
            </div>
          </ActionToggle>

          <ActionToggle
            icon={MessageSquare}
            label="Enviar SMS pós-ligação"
            enabled={config.actionSmsEnabled}
            onToggle={v => update("actionSmsEnabled", v)}
          >
            <div className="pt-2 space-y-1.5">
              <Label className="text-[10px]">Mensagem enviada após a ligação</Label>
              <Textarea
                value={config.actionPostSms}
                onChange={e => update("actionPostSms", e.target.value)}
                placeholder="Obrigado pelo contato! Segue o resumo..."
                className="min-h-[40px] text-xs"
              />
            </div>
          </ActionToggle>

          <ActionToggle
            icon={Webhook}
            label="Chamar Webhook"
            enabled={config.actionWebhookEnabled}
            onToggle={v => update("actionWebhookEnabled", v)}
          >
            <div className="pt-2 space-y-1.5">
              <Label className="text-[10px]">URL chamada ao final com transcrição</Label>
              <Input
                value={config.actionWebhookUrl}
                onChange={e => update("actionWebhookUrl", e.target.value)}
                placeholder="https://..."
                className="h-7 text-xs font-mono"
              />
            </div>
          </ActionToggle>
        </section>

      </div>
    </ScrollArea>
  );
};

export default VoiceConfigPanel;
