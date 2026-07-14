/**
 * Stark Settings — refeito com tabs internas + stats no topo.
 *
 * Layout:
 *  - StatsHeader (4 cards: minutos voz / custo LLM / sessoes / pack)
 *  - Tabs: Personalidade | Voz | Ferramentas | Atalhos | Uso
 *
 * Padrao visual segue SubscriptionTab.tsx (max-w-3xl, icones em circulo,
 * tipografia consistente).
 */
import { useEffect, useState } from "react";
import {
  Mic, Play, Loader2, Save, AlertTriangle, Zap, BarChart3,
  Plus, Trash2, GripVertical, Bell, Wrench, Clock, History, ShoppingBag,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { useElevenLabsVoices } from "@/hooks/use-elevenlabs-voices";
import { useStarkPrefs, type StarkPersonaPreset, type StarkLanguage } from "@/hooks/use-stark-prefs";
import { useStarkCommands } from "@/hooks/use-stark-commands";
import { useStarkUsage } from "@/hooks/use-stark-usage";
import { useStarkVoiceCredits } from "@/hooks/use-stark-voice-credits";
import { useStarkPlatformTools } from "@/hooks/use-stark-platform-tools";
import { STARK_TOOL_CATALOG } from "@/lib/stark-tools-catalog";
import { toast } from "sonner";

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const PREVIEW_TEXT = "Olá, sou o Stark, seu copiloto de voz. À disposição.";

const PRESET_OPTIONS: { value: StarkPersonaPreset; label: string; hint: string; tone: number; response: number; energy: number }[] = [
  { value: "executivo",    label: "Executivo",    hint: "Confiante, calmo, eficiente",     tone: 30, response: 20, energy: 35 },
  { value: "profissional", label: "Profissional", hint: "Corporativo, objetivo, formal",   tone: 15, response: 35, energy: 25 },
  { value: "casual",       label: "Casual",       hint: "Descontraído, amigável, próximo", tone: 80, response: 30, energy: 70 },
  { value: "custom",       label: "Personalizado", hint: "Você ajusta tudo manualmente",   tone: 50, response: 50, energy: 50 },
];

const LANGUAGE_OPTIONS: { value: StarkLanguage; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en",    label: "English" },
  { value: "es",    label: "Español" },
];

// Catalogo canonico compartilhado com o painel admin — ver
// src/lib/stark-tools-catalog.ts. Tools bloqueadas pela PLATAFORMA
// (admin) nem aparecem aqui.

export default function StarkSettingsTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stark</h2>
          <p className="text-xs text-muted-foreground">
            Configure seu copiloto. Esses ajustes valem em todas as telas — não confundir com a voz dos agentes.
          </p>
        </div>
      </div>

      <StatsHeader />

      <Tabs defaultValue="persona" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="persona" className="gap-1.5"><Zap className="w-3.5 h-3.5" />Personalidade</TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5"><Mic className="w-3.5 h-3.5" />Voz</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5"><Wrench className="w-3.5 h-3.5" />Ferramentas</TabsTrigger>
          <TabsTrigger value="commands" className="gap-1.5"><Zap className="w-3.5 h-3.5" />Atalhos</TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Uso</TabsTrigger>
        </TabsList>

        <TabsContent value="persona"><PersonaSection /></TabsContent>
        <TabsContent value="voice"><VoiceSection /></TabsContent>
        <TabsContent value="tools"><ToolsSection /></TabsContent>
        <TabsContent value="commands"><CommandsSection /></TabsContent>
        <TabsContent value="usage" className="space-y-4">
          <UsageSection />
          <HistorySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Stats no topo ────────────────────────────────────────────────────────

function StatsHeader() {
  const { credits, loading: cLoading } = useStarkVoiceCredits(0);
  const { summary, loading: uLoading } = useStarkUsage(30);

  const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m/60)}h${Math.round(m%60).toString().padStart(2,"0")}` : `${Math.round(m)}min`;
  const fmtBRL = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Clock className="w-4 h-4" />}
        label="Minutos restantes"
        value={cLoading ? "—" : fmtMin(credits.totalRemaining)}
        hint={cLoading ? "" : `Tier ${fmtMin(credits.tierRemaining)} + Packs ${fmtMin(credits.packRemaining)}`}
        highlight
      />
      <StatCard
        icon={<Wallet className="w-4 h-4" />}
        label="Custo LLM (30d)"
        value={uLoading ? "—" : fmtBRL(summary.totalCostCents)}
        hint={uLoading ? "" : `${summary.callCount} chamadas`}
      />
      <StatCard
        icon={<History className="w-4 h-4" />}
        label="Tier usado"
        value={cLoading ? "—" : `${credits.tierUsed.toFixed(0)}/${credits.tierTotal}min`}
        hint="Resetado todo mês"
      />
      <ActionCard
        icon={<ShoppingBag className="w-4 h-4" />}
        label="Comprar pack"
        hint="60 / 300 / 1000 min"
        onClick={() => toast.info("Compra de pack — em breve via Asaas")}
      />
    </div>
  );
}

function StatCard({ icon, label, value, hint, highlight }: { icon: React.ReactNode; label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[11px] uppercase tracking-wider font-medium">{label}</span>
        </div>
        <p className={`text-xl font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ActionCard({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition p-4 space-y-1"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-base font-medium text-foreground">+ Adicionar</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </button>
  );
}

// ── Personalidade ────────────────────────────────────────────────────────

function PersonaSection() {
  const { prefs, loading, saving, save } = useStarkPrefs();
  const [preset, setPreset] = useState<StarkPersonaPreset>("executivo");
  const [userName, setUserName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [bubbleEnabled, setBubbleEnabled] = useState(true);
  const [language, setLanguage] = useState<StarkLanguage>("pt-BR");
  const [tone, setTone] = useState(50);
  const [responseLength, setResponseLength] = useState(25);
  const [energy, setEnergy] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (loading) return;
    setPreset(prefs.persona_preset);
    setUserName(prefs.user_name ?? "");
    setCustomPrompt(prefs.persona_prompt ?? "");
    setBubbleEnabled(prefs.bubble_enabled);
    setLanguage(prefs.language);
    setTone(prefs.tone);
    setResponseLength(prefs.response_length);
    setEnergy(prefs.energy);
  }, [loading, prefs]);

  // Aplica preset → sliders (visual feedback imediato).
  function applyPreset(p: StarkPersonaPreset) {
    setPreset(p);
    const opt = PRESET_OPTIONS.find(o => o.value === p);
    if (opt && p !== "custom") {
      setTone(opt.tone);
      setResponseLength(opt.response);
      setEnergy(opt.energy);
    }
  }

  const dirty =
    preset !== prefs.persona_preset ||
    (userName || null) !== prefs.user_name ||
    (customPrompt || null) !== prefs.persona_prompt ||
    bubbleEnabled !== prefs.bubble_enabled ||
    language !== prefs.language ||
    tone !== prefs.tone ||
    responseLength !== prefs.response_length ||
    energy !== prefs.energy;

  async function onSave() {
    const ok = await save({
      persona_preset: preset,
      user_name: userName.trim() || null,
      persona_prompt: preset === "custom" ? (customPrompt.trim() || null) : null,
      bubble_enabled: bubbleEnabled,
      language,
      tone,
      response_length: responseLength,
      energy,
    });
    if (ok) toast.success("Personalidade atualizada");
  }

  const toneLabel = tone < 33 ? "Formal" : tone < 67 ? "Equilibrado" : "Casual";
  const lengthLabel = responseLength < 33 ? "Curta" : responseLength < 67 ? "Média" : "Detalhada";
  const energyLabel = energy < 33 ? "Sério" : energy < 67 ? "Neutro" : "Animado";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como o Stark fala com você</CardTitle>
        <CardDescription className="text-xs">
          Escolha um estilo pronto ou ajuste os sliders manualmente. Vale pra voz e texto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs">Estilo</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => applyPreset(o.value)}
                className={`text-left rounded-lg border p-3 transition ${
                  preset === o.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className="text-sm font-medium">{o.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{o.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <SliderRow
            label="Tom"
            value={tone}
            onChange={(v) => { setTone(v); setPreset("custom"); }}
            leftHint="Formal" rightHint="Casual" currentLabel={toneLabel}
          />
          <SliderRow
            label="Tamanho da resposta"
            value={responseLength}
            onChange={(v) => { setResponseLength(v); setPreset("custom"); }}
            leftHint="Curta" rightHint="Detalhada" currentLabel={lengthLabel}
          />
          <SliderRow
            label="Energia"
            value={energy}
            onChange={(v) => { setEnergy(v); setPreset("custom"); }}
            leftHint="Sério" rightHint="Animado" currentLabel={energyLabel}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Idioma</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as StarkLanguage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Como te chamar</Label>
            <Input
              placeholder='ex: "Willy", "chefe"'
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={40}
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Bell className="w-3 h-3" /> Bubble flutuante
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Mostra o orb do Stark nas telas de gestão.
            </p>
          </div>
          <Switch checked={bubbleEnabled} onCheckedChange={setBubbleEnabled} />
        </div>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              {showAdvanced ? "Ocultar" : "Mostrar"} system prompt avançado
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1.5">
            <Label className="text-xs">System prompt customizado (opcional)</Label>
            <Textarea
              rows={6}
              placeholder="Sobrescreve TODO o prompt base. Use quando precisar de controle total."
              value={customPrompt}
              onChange={(e) => { setCustomPrompt(e.target.value); if (e.target.value) setPreset("custom"); }}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              As regras de AÇÃO (uso de tools, sem markdown) são sempre anexadas no final.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button size="sm" className="gap-1.5" onClick={onSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar personalidade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderRow({ label, value, onChange, leftHint, rightHint, currentLabel }: {
  label: string; value: number; onChange: (v: number) => void;
  leftHint: string; rightHint: string; currentLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Badge variant="secondary" className="text-[10px]">{currentLabel}</Badge>
      </div>
      <Slider min={0} max={100} step={5} value={[value]} onValueChange={(v) => onChange(v[0])} />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{leftHint}</span><span>{rightHint}</span>
      </div>
    </div>
  );
}

// ── Voz ──────────────────────────────────────────────────────────────────

function VoiceSection() {
  const { voices, loading, hasUserKey, error } = useElevenLabsVoices();
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE);
  const [stability, setStability] = useState<number>(0.5);
  const [speed, setSpeed] = useState<number>(1.0);
  const [savedVoiceId, setSavedVoiceId] = useState<string>(DEFAULT_VOICE);
  const [savedStability, setSavedStability] = useState<number>(0.5);
  const [savedSpeed, setSavedSpeed] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", user.id)
        .in("provider", ["stark_voice_id", "stark_voice_stability", "stark_voice_speed"]);
      const map = new Map<string, string>();
      (data ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));
      const vid = map.get("stark_voice_id") || DEFAULT_VOICE;
      const stab = parseFloat(map.get("stark_voice_stability") || "0.5");
      const spd = parseFloat(map.get("stark_voice_speed") || "1.0");
      setVoiceId(vid); setSavedVoiceId(vid);
      setStability(Number.isFinite(stab) ? stab : 0.5); setSavedStability(Number.isFinite(stab) ? stab : 0.5);
      setSpeed(Number.isFinite(spd) ? spd : 1.0); setSavedSpeed(Number.isFinite(spd) ? spd : 1.0);
    })();
  }, []);

  const dirty = voiceId !== savedVoiceId || stability !== savedStability || speed !== savedSpeed;

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado"); return; }
      const rows = [
        { user_id: user.id, provider: "stark_voice_id", api_key: voiceId },
        { user_id: user.id, provider: "stark_voice_stability", api_key: String(stability) },
        { user_id: user.id, provider: "stark_voice_speed", api_key: String(speed) },
      ];
      const { error: upErr } = await supabase
        .from("user_api_keys")
        .upsert(rows, { onConflict: "user_id,provider" });
      if (upErr) throw upErr;
      setSavedVoiceId(voiceId); setSavedStability(stability); setSavedSpeed(speed);
      toast.success("Voz atualizada");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada"); return; }
      const resp = await fetch(fnUrl("browser-tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: PREVIEW_TEXT, voiceId, stability, speed }),
      });
      const ct = resp.headers.get("content-type") || "";
      if (!resp.ok || !ct.includes("audio")) {
        let msg = "Falha ao gerar preview";
        try { const j = await resp.json(); msg = j?.message || j?.error || msg; } catch { /* noop */ }
        toast.error(msg);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  const sortedVoices = [...voices].sort((a, b) => {
    const aPt = a.labels?.language?.toLowerCase().includes("pt") ? 0 : 1;
    const bPt = b.labels?.language?.toLowerCase().includes("pt") ? 0 : 1;
    if (aPt !== bPt) return aPt - bPt;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Voz do Stark</CardTitle>
        <CardDescription className="text-xs">
          As vozes vêm da sua conta ElevenLabs. Clique em "Testar" pra ouvir antes de salvar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasUserKey && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200">
              Conecte uma chave ElevenLabs em <span className="font-semibold">Provedores</span> pra desbloquear o catálogo.
            </p>
          </div>
        )}
        {hasUserKey && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Voz</Label>
          <Select value={voiceId} onValueChange={setVoiceId} disabled={loading || !hasUserKey}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Carregando vozes…" : "Escolha uma voz"} />
            </SelectTrigger>
            <SelectContent>
              {sortedVoices.map((v) => (
                <SelectItem key={v.voice_id} value={v.voice_id}>
                  <span className="flex items-center gap-2">
                    <span>{v.name}</span>
                    {v.labels?.language && (
                      <span className="text-[10px] text-muted-foreground uppercase">{v.labels.language}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Estabilidade</span><span className="text-muted-foreground">{stability.toFixed(2)}</span>
            </Label>
            <Slider min={0} max={1} step={0.05} value={[stability]} onValueChange={(v) => setStability(v[0])} disabled={!hasUserKey} />
            <p className="text-[11px] text-muted-foreground">Maior = consistente. Menor = expressivo.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Velocidade</span><span className="text-muted-foreground">{speed.toFixed(2)}x</span>
            </Label>
            <Slider min={0.7} max={1.3} step={0.05} value={[speed]} onValueChange={(v) => setSpeed(v[0])} disabled={!hasUserKey} />
            <p className="text-[11px] text-muted-foreground">Mais rápido cansa menos.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTest} disabled={testing || !hasUserKey}>
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Testar voz
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={!dirty || saving || !hasUserKey}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar voz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Ferramentas ──────────────────────────────────────────────────────────

function ToolsSection() {
  const { prefs, loading, saving, save } = useStarkPrefs();
  const { isAllowed, loading: platformLoading } = useStarkPlatformTools();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  // So tools que a PLATAFORMA permite aparecem pro user decidir.
  const visibleTools = STARK_TOOL_CATALOG.filter(t => isAllowed(t.id));

  useEffect(() => {
    if (loading) return;
    // Default: tudo ON quando tools_enabled é null/ausente.
    const map: Record<string, boolean> = {};
    STARK_TOOL_CATALOG.forEach(t => {
      map[t.id] = prefs.tools_enabled?.[t.id] ?? true;
    });
    setEnabled(map);
  }, [loading, prefs]);

  const groups = Array.from(new Set(visibleTools.map(t => t.group)));
  const dirty = JSON.stringify(enabled) !== JSON.stringify(
    Object.fromEntries(STARK_TOOL_CATALOG.map(t => [t.id, prefs.tools_enabled?.[t.id] ?? true])),
  );

  async function onSave() {
    const ok = await save({ tools_enabled: enabled });
    if (ok) toast.success("Ferramentas atualizadas");
  }

  if (platformLoading) {
    return (
      <Card><CardContent className="flex items-center justify-center py-10">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ferramentas do Stark</CardTitle>
        <CardDescription className="text-xs">
          Controle quais dados o Stark pode consultar e quais ações pode executar por voz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map(g => (
          <div key={g} className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{g}</Label>
            <div className="space-y-1.5">
              {visibleTools.filter(t => t.group === g).map(t => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {t.label}
                      {t.write && <Badge variant="outline" className="text-[9px] uppercase">ação</Badge>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  </div>
                  <Switch
                    checked={enabled[t.id] ?? true}
                    onCheckedChange={(v) => setEnabled(prev => ({ ...prev, [t.id]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button size="sm" className="gap-1.5" onClick={onSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar ferramentas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Atalhos (comandos rapidos — preservado) ──────────────────────────────

const SUGGESTED_COMMANDS = [
  { label: "Briefing matinal", prompt: "Resumo das qualificações de ontem e o que está agendado pra hoje", icon: "Coffee" },
  { label: "Fechar dia", prompt: "Como foi o dia? Tickets resolvidos, qualificações, receita", icon: "Moon" },
  { label: "Pipeline da semana", prompt: "Reuniões agendadas essa semana por agente", icon: "Calendar" },
];

function CommandsSection() {
  const { commands, loading, create, update, remove } = useStarkCommands();
  const [draftLabel, setDraftLabel] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!draftLabel.trim() || !draftPrompt.trim()) { toast.error("Preencha rótulo e prompt"); return; }
    setAdding(true);
    const ok = await create({
      label: draftLabel.trim(), prompt: draftPrompt.trim(), icon: null,
      sort_order: commands.length, enabled: true,
    });
    setAdding(false);
    if (ok) { setDraftLabel(""); setDraftPrompt(""); toast.success("Atalho adicionado"); }
  }

  async function handleAddSuggested(s: typeof SUGGESTED_COMMANDS[number]) {
    const ok = await create({
      label: s.label, prompt: s.prompt, icon: s.icon,
      sort_order: commands.length, enabled: true,
    });
    if (ok) toast.success(`"${s.label}" adicionado`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atalhos rápidos</CardTitle>
        <CardDescription className="text-xs">
          Botões que aparecem na home do Stark. Um clique = pergunta pronta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {commands.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Nenhum atalho ainda. Comece pelos sugeridos:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_COMMANDS.map(s => (
                    <Button key={s.label} variant="outline" size="sm" className="h-7 gap-1 text-xs"
                      onClick={() => handleAddSuggested(s)}>
                      <Plus className="w-3 h-3" /> {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {commands.length > 0 && (
              <div className="space-y-2">
                {commands.map(cmd => (
                  <div key={cmd.id} className="flex items-start gap-2 rounded-lg border border-border p-3 group">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input value={cmd.label} onChange={(e) => update(cmd.id, { label: e.target.value })}
                        className="h-7 text-sm font-medium" />
                      <Textarea value={cmd.prompt} onChange={(e) => update(cmd.id, { prompt: e.target.value })}
                        rows={2} className="text-xs resize-none" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                      <Switch checked={cmd.enabled} onCheckedChange={(v) => update(cmd.id, { enabled: v })} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { if (confirm(`Remover "${cmd.label}"?`)) remove(cmd.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Label className="text-xs">Adicionar novo atalho</Label>
              <Input placeholder='Rótulo (ex: "Status do SDR")' value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)} className="h-8 text-sm" maxLength={60} />
              <Textarea placeholder="Pergunta que vai ser mandada ao Stark" value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)} rows={2} className="text-xs resize-none" />
              <div className="flex justify-end">
                <Button size="sm" className="gap-1.5" onClick={handleAdd} disabled={adding}>
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Adicionar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Uso & Custos LLM (preservado) ────────────────────────────────────────

function UsageSection() {
  const { summary, loading } = useStarkUsage(30);
  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
  const formatBRL = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const providers = Object.entries(summary.byProvider).sort((a, b) => b[1].tokens - a[1].tokens);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custos LLM — últimos 30 dias</CardTitle>
        <CardDescription className="text-xs">
          Tokens e custo estimado da sua chave de LLM. Inclui texto e voz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : summary.callCount === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhum uso registrado ainda. Use o Stark e os números aparecem aqui.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Chamadas" value={summary.callCount.toLocaleString("pt-BR")} />
              <MiniStat label="Tokens" value={formatTokens(summary.totalTokens)} />
              <MiniStat label="Prompt/Saída" value={`${formatTokens(summary.totalPromptTokens)}/${formatTokens(summary.totalCompletionTokens)}`} />
              <MiniStat label="Custo" value={formatBRL(summary.totalCostCents)} highlight />
            </div>
            {providers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Por provider</Label>
                <div className="space-y-1">
                  {providers.map(([p, agg]) => (
                    <div key={p} className="flex items-center justify-between text-xs rounded border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">{p}</Badge>
                        <span className="text-muted-foreground">{agg.calls} chamadas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{formatTokens(agg.tokens)} tk</span>
                        <span className="font-medium">{formatBRL(agg.costCents)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-3 ${highlight ? "bg-primary/5" : ""}`}>
      <p className="text-[11px] uppercase text-muted-foreground tracking-wider">{label}</p>
      <p className={`text-base font-semibold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

// ── Histórico de sessões de voz ──────────────────────────────────────────

function HistorySection() {
  const { sessions, loading } = useStarkVoiceCredits(10);
  const fmtDur = (s: number) => s >= 60 ? `${Math.floor(s/60)}m${(s%60).toString().padStart(2,"0")}s` : `${s}s`;
  const fmtDate = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimas sessões de voz</CardTitle>
        <CardDescription className="text-xs">
          As 10 conversas mais recentes com o Stark Voice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma sessão de voz ainda. Clique no orb do Stark e fale.
          </p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-muted-foreground shrink-0">{fmtDate(s.created_at)}</span>
                  <span className="font-medium">{fmtDur(s.duration_seconds)}</span>
                  {s.tools_called?.length > 0 && (
                    <span className="text-muted-foreground truncate">
                      {s.tools_called.slice(0, 3).join(", ")}
                      {s.tools_called.length > 3 ? ` +${s.tools_called.length - 3}` : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.llm_model && <Badge variant="outline" className="text-[10px]">{s.llm_model}</Badge>}
                  {s.credit_source && <Badge variant="secondary" className="text-[10px]">{s.credit_source}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
