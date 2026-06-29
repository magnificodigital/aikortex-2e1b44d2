import { useEffect, useState } from "react";
import {
  Mic, Play, Loader2, Save, AlertTriangle, Sparkles, Zap, BarChart3,
  Plus, Trash2, GripVertical, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { useElevenLabsVoices } from "@/hooks/use-elevenlabs-voices";
import { useStarkPrefs, type StarkPersonaPreset } from "@/hooks/use-stark-prefs";
import { useStarkCommands } from "@/hooks/use-stark-commands";
import { useStarkUsage } from "@/hooks/use-stark-usage";
import { toast } from "sonner";

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const PREVIEW_TEXT = "Olá, sou o Stark, seu copiloto de voz. À disposição.";

const PRESET_OPTIONS: { value: StarkPersonaPreset; label: string; hint: string }[] = [
  { value: "jarvis", label: "Jarvis", hint: "Confiante, calmo, eficiente — estilo Tony Stark" },
  { value: "profissional", label: "Profissional", hint: "Corporativo, objetivo, formal" },
  { value: "casual", label: "Casual", hint: "Descontraído, amigável, próximo" },
  { value: "custom", label: "Custom", hint: "Você escreve do zero o system prompt" },
];

export default function StarkSettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Stark
        </h2>
        <p className="text-xs text-muted-foreground">
          Configure seu copiloto. Esses ajustes valem para o Stark em todas as telas —
          não confundir com a voz dos agentes.
        </p>
      </div>

      <PersonaSection />
      <VoiceProviderSection />
      <VoiceSection />
      <CommandsSection />
      <UsageSection />
    </div>
  );
}

// ── Voice Provider toggle (Fase 3 — LiveKit beta) ─────────────────────

function VoiceProviderSection() {
  const [provider, setProvider] = useState<"legacy" | "livekit">(() => {
    if (typeof window === "undefined") return "legacy";
    return localStorage.getItem("stark_voice_provider") === "livekit" ? "livekit" : "legacy";
  });

  function handleChange(next: "legacy" | "livekit") {
    setProvider(next);
    localStorage.setItem("stark_voice_provider", next);
    // Dispara evento custom pra StarkInterface trocar provider sem reload
    window.dispatchEvent(new Event("stark:voice-provider-changed"));
    toast.success(next === "livekit"
      ? "LiveKit ativado. Stark vai conectar via streaming (Jarvis mode)."
      : "Voltou pro modo legacy (gravacao + edge function).");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" /> Provedor de voz (beta)
        </CardTitle>
        <CardDescription className="text-xs">
          Escolha o motor de voz do Stark. LiveKit é streaming em tempo real
          (sub-segundo). Legacy é o atual (gravação + envio).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleChange("legacy")}
            className={`rounded-lg border p-3 text-left transition ${
              provider === "legacy"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/70"
            }`}
          >
            <p className="text-sm font-medium">Legacy</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Edge function · ~2-5s por resposta · estável
            </p>
          </button>
          <button
            onClick={() => handleChange("livekit")}
            className={`rounded-lg border p-3 text-left transition ${
              provider === "livekit"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/70"
            }`}
          >
            <p className="text-sm font-medium flex items-center gap-1.5">
              LiveKit
              <Badge variant="outline" className="text-[9px] uppercase">Beta</Badge>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Streaming WebRTC · ~300-800ms · Jarvis mode
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Personalidade ────────────────────────────────────────────────────────

function PersonaSection() {
  const { prefs, loading, saving, save } = useStarkPrefs();
  const [preset, setPreset] = useState<StarkPersonaPreset>("jarvis");
  const [userName, setUserName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [bubbleEnabled, setBubbleEnabled] = useState(true);

  useEffect(() => {
    if (loading) return;
    setPreset(prefs.persona_preset);
    setUserName(prefs.user_name ?? "");
    setCustomPrompt(prefs.persona_prompt ?? "");
    setBubbleEnabled(prefs.bubble_enabled);
  }, [loading, prefs]);

  const dirty =
    preset !== prefs.persona_preset ||
    (userName || null) !== prefs.user_name ||
    (customPrompt || null) !== prefs.persona_prompt ||
    bubbleEnabled !== prefs.bubble_enabled;

  async function onSave() {
    const ok = await save({
      persona_preset: preset,
      user_name: userName.trim() || null,
      persona_prompt: preset === "custom" ? (customPrompt.trim() || null) : null,
      bubble_enabled: bubbleEnabled,
    });
    if (ok) toast.success("Personalidade do Stark atualizada");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Personalidade
        </CardTitle>
        <CardDescription className="text-xs">
          Como o Stark fala com você. Essas regras viram parte do system prompt em todo turno.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Preset</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as StarkPersonaPreset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex flex-col">
                    <span>{o.label}</span>
                    <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Como o Stark deve te chamar</Label>
          <Input
            placeholder='ex: "Willy", "sir", "chefe"'
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={40}
          />
          <p className="text-[10px] text-muted-foreground">
            Vazio = Stark escolhe pelo preset (Jarvis usa "sir").
          </p>
        </div>

        {preset === "custom" && (
          <div className="space-y-1.5">
            <Label className="text-xs">System prompt customizado</Label>
            <Textarea
              rows={8}
              placeholder="Escreva do zero como o Stark deve se comportar..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              As regras de AÇÃO (uso de tools, sem markdown, respostas curtas) são sempre anexadas no final.
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Bell className="w-3 h-3" /> Bubble flutuante
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Mostra o orb do Stark flutuando nas telas de gestão.
            </p>
          </div>
          <Switch checked={bubbleEnabled} onCheckedChange={setBubbleEnabled} />
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button size="sm" className="gap-1.5" onClick={onSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Voz (preservado, só refatorado pra subcomponent) ─────────────────────

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
        .in("provider", [
          "stark_voice_id", "stark_voice_stability", "stark_voice_speed",
          "spark_voice_id", "spark_voice_stability", "spark_voice_speed",
        ]);
      const map = new Map<string, string>();
      (data ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));
      // Cascade: stark_* (novo) -> spark_* (legacy pre-rename)
      const pick = (k: "voice_id" | "voice_stability" | "voice_speed") =>
        map.get(`stark_${k}`) || map.get(`spark_${k}`) || "";
      const vid = pick("voice_id") || DEFAULT_VOICE;
      const stab = parseFloat(pick("voice_stability") || "0.5");
      const spd = parseFloat(pick("voice_speed") || "1.0");
      setVoiceId(vid); setSavedVoiceId(vid);
      setStability(Number.isFinite(stab) ? stab : 0.5);
      setSavedStability(Number.isFinite(stab) ? stab : 0.5);
      setSpeed(Number.isFinite(spd) ? spd : 1.0);
      setSavedSpeed(Number.isFinite(spd) ? spd : 1.0);
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
      toast.success("Voz do Stark atualizada");
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" /> Voz
        </CardTitle>
        <CardDescription className="text-xs">
          Escolha a voz do Stark. As vozes vêm da sua conta ElevenLabs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasUserKey && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200">
              Você ainda não conectou uma chave ElevenLabs. Vá em <span className="font-semibold">Provedores</span> primeiro.
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
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {v.labels.language}
                      </span>
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
              <span>Estabilidade</span>
              <span className="text-muted-foreground">{stability.toFixed(2)}</span>
            </Label>
            <Slider
              min={0} max={1} step={0.05}
              value={[stability]}
              onValueChange={(v) => setStability(v[0])}
              disabled={!hasUserKey}
            />
            <p className="text-[10px] text-muted-foreground">
              Maior = mais consistente. Menor = mais expressivo.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Velocidade</span>
              <span className="text-muted-foreground">{speed.toFixed(2)}x</span>
            </Label>
            <Slider
              min={0.7} max={1.3} step={0.05}
              value={[speed]}
              onValueChange={(v) => setSpeed(v[0])}
              disabled={!hasUserKey}
            />
            <p className="text-[10px] text-muted-foreground">
              Mais rápido cansa menos, mais lento parece mais natural.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={handleTest} disabled={testing || !hasUserKey}
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Testar voz
          </Button>
          <Button
            size="sm" className="gap-1.5"
            onClick={handleSave} disabled={!dirty || saving || !hasUserKey}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Comandos rapidos ─────────────────────────────────────────────────────

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
    if (!draftLabel.trim() || !draftPrompt.trim()) {
      toast.error("Preencha rótulo e prompt");
      return;
    }
    setAdding(true);
    const ok = await create({
      label: draftLabel.trim(),
      prompt: draftPrompt.trim(),
      icon: null,
      sort_order: commands.length,
      enabled: true,
    });
    setAdding(false);
    if (ok) {
      setDraftLabel(""); setDraftPrompt("");
      toast.success("Comando adicionado");
    }
  }

  async function handleAddSuggested(s: typeof SUGGESTED_COMMANDS[number]) {
    const ok = await create({
      label: s.label,
      prompt: s.prompt,
      icon: s.icon,
      sort_order: commands.length,
      enabled: true,
    });
    if (ok) toast.success(`"${s.label}" adicionado`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Comandos rápidos
        </CardTitle>
        <CardDescription className="text-xs">
          Atalhos que aparecem como botões na home do Stark. Um clique = pergunta pronta.
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
                <p className="text-xs text-muted-foreground">Nenhum comando ainda. Comece pelos sugeridos:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_COMMANDS.map(s => (
                    <Button
                      key={s.label}
                      variant="outline" size="sm" className="h-7 gap-1 text-xs"
                      onClick={() => handleAddSuggested(s)}
                    >
                      <Plus className="w-3 h-3" /> {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {commands.length > 0 && (
              <div className="space-y-2">
                {commands.map(cmd => (
                  <div
                    key={cmd.id}
                    className="flex items-start gap-2 rounded-lg border border-border p-3 group"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input
                        value={cmd.label}
                        onChange={(e) => update(cmd.id, { label: e.target.value })}
                        className="h-7 text-sm font-medium"
                      />
                      <Textarea
                        value={cmd.prompt}
                        onChange={(e) => update(cmd.id, { prompt: e.target.value })}
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 pt-1 shrink-0">
                      <Switch
                        checked={cmd.enabled}
                        onCheckedChange={(v) => update(cmd.id, { enabled: v })}
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Remover "${cmd.label}"?`)) remove(cmd.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Label className="text-xs">Adicionar novo comando</Label>
              <Input
                placeholder='Rótulo (ex: "Status do SDR")'
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                className="h-8 text-sm"
                maxLength={60}
              />
              <Textarea
                placeholder="Pergunta que vai ser mandada ao Stark"
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
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

// ── Uso & Custos LLM ─────────────────────────────────────────────────────

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
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Uso & Custos LLM
        </CardTitle>
        <CardDescription className="text-xs">
          Últimos 30 dias. Consumo do LLM da sua agência — você paga via sua chave.
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
              <Stat label="Chamadas" value={summary.callCount.toLocaleString("pt-BR")} />
              <Stat label="Tokens" value={formatTokens(summary.totalTokens)} />
              <Stat label="Prompt / Saída" value={`${formatTokens(summary.totalPromptTokens)} / ${formatTokens(summary.totalCompletionTokens)}`} />
              <Stat label="Custo estimado" value={formatBRL(summary.totalCostCents)} highlight />
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-3 ${highlight ? "bg-primary/5" : ""}`}>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
      <p className={`text-base font-semibold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
