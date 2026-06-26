import { useEffect, useState } from "react";
import { Mic, Play, Loader2, Save, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { useElevenLabsVoices } from "@/hooks/use-elevenlabs-voices";
import { toast } from "sonner";

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const PREVIEW_TEXT = "Olá, sou o Spark, seu copiloto de voz. À disposição.";

export default function SparkSettingsTab() {
  const { voices, loading, hasUserKey, error } = useElevenLabsVoices();
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE);
  const [stability, setStability] = useState<number>(0.5);
  const [speed, setSpeed] = useState<number>(1.0);
  const [savedVoiceId, setSavedVoiceId] = useState<string>(DEFAULT_VOICE);
  const [savedStability, setSavedStability] = useState<number>(0.5);
  const [savedSpeed, setSavedSpeed] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Carrega preferencias salvas do user (spark_voice_id, spark_voice_stability, spark_voice_speed)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", user.id)
        .in("provider", ["spark_voice_id", "spark_voice_stability", "spark_voice_speed"]);
      const map = new Map<string, string>();
      (data ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));
      const vid = map.get("spark_voice_id") || DEFAULT_VOICE;
      const stab = parseFloat(map.get("spark_voice_stability") || "0.5");
      const spd = parseFloat(map.get("spark_voice_speed") || "1.0");
      setVoiceId(vid);
      setSavedVoiceId(vid);
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
        { user_id: user.id, provider: "spark_voice_id", api_key: voiceId },
        { user_id: user.id, provider: "spark_voice_stability", api_key: String(stability) },
        { user_id: user.id, provider: "spark_voice_speed", api_key: String(speed) },
      ];
      const { error: upErr } = await supabase
        .from("user_api_keys")
        .upsert(rows, { onConflict: "user_id,provider" });
      if (upErr) throw upErr;
      setSavedVoiceId(voiceId);
      setSavedStability(stability);
      setSavedSpeed(speed);
      toast.success("Voz do Spark atualizada");
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
    // pt-BR primeiro, depois alfabético
    const aPt = a.labels?.language?.toLowerCase().includes("pt") ? 0 : 1;
    const bPt = b.labels?.language?.toLowerCase().includes("pt") ? 0 : 1;
    if (aPt !== bPt) return aPt - bPt;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" /> Spark
        </h2>
        <p className="text-xs text-muted-foreground">
          Ajustes do copiloto de voz da plataforma. Esses ajustes valem para o Spark em todas as telas — não confundir com a voz dos agentes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voz</CardTitle>
          <CardDescription className="text-xs">
            Escolha a voz que o Spark vai usar. As vozes vêm da sua conta ElevenLabs.
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
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleTest}
              disabled={testing || !hasUserKey}
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Testar voz
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={!dirty || saving || !hasUserKey}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
