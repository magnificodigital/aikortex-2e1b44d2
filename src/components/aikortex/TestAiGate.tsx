import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Trava "escolha a IA para testar" (Master v7.4 / decisão 2026-08-11).
 * Antes de TESTAR o agente, a agência é obrigada a escolher um provider + modelo
 * e ter a chave conectada (BYOK). Grava config.provider + config.model no agente.
 * A MONTAGEM segue na plataforma; do teste em diante é a chave da agência.
 */

const GATE_PROVIDERS: { id: string; label: string; models: string[] }[] = [
  { id: "openai",    label: "OpenAI",         models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"] },
  { id: "anthropic", label: "Anthropic",      models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5"] },
  { id: "gemini",    label: "Google Gemini",  models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  { id: "deepseek",  label: "DeepSeek",       models: ["deepseek-chat", "deepseek-reasoner"] },
  { id: "qwen",      label: "Qwen",           models: ["qwen-max", "qwen-plus", "qwen-turbo"] },
  { id: "kimi",      label: "Kimi",           models: ["kimi-k2-0711-preview", "moonshot-v1-8k"] },
  { id: "glm",       label: "GLM",            models: ["glm-4-plus", "glm-4-flash"] },
];

interface TestAiGateProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agentId: string;
  initialProvider?: string | null;
  initialModel?: string | null;
  /** Chamado após salvar provider+modelo com chave conectada — segue pro teste. */
  onConfirm: (provider: string, model: string) => void;
}

export default function TestAiGate({
  open, onOpenChange, agentId, initialProvider, initialModel, onConfirm,
}: TestAiGateProps) {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [provider, setProvider] = useState<string>(initialProvider || "");
  const [model, setModel] = useState<string>(initialModel || "");
  const [saving, setSaving] = useState(false);

  // Carrega quais providers a agência já conectou chave (user_api_keys).
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ids = GATE_PROVIDERS.map((p) => p.id);
      const { data } = await supabase
        .from("user_api_keys").select("provider, api_key")
        .eq("user_id", user.id).in("provider", ids);
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => { if (r.api_key) set.add(r.provider); });
      setConnected(set);
    })();
  }, [open]);

  const suggestions = useMemo(
    () => GATE_PROVIDERS.find((p) => p.id === provider)?.models ?? [],
    [provider],
  );
  const hasKey = provider ? connected.has(provider) : false;
  const canTest = !!provider && !!model.trim() && hasKey;

  const handleProvider = (p: string) => {
    setProvider(p);
    // Pré-preenche com o 1º modelo sugerido do provider.
    setModel(GATE_PROVIDERS.find((x) => x.id === p)?.models[0] ?? "");
  };

  const handleConfirm = async () => {
    if (!canTest) return;
    setSaving(true);
    try {
      // Grava dentro de config (JSONB) — é o que o runtime lê (cfg.provider/cfg.model).
      const { data: row } = await supabase
        .from("user_agents").select("config").eq("id", agentId).maybeSingle();
      const nextConfig = { ...((row?.config as any) ?? {}), provider, model: model.trim() };
      const { error } = await supabase
        .from("user_agents")
        .update({ config: nextConfig, provider, model: model.trim() })
        .eq("id", agentId);
      if (error) throw error;
      toast.success("IA configurada. Vamos testar!");
      onConfirm(provider, model.trim());
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar a configuração de IA.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha a IA para testar</DialogTitle>
          <DialogDescription>
            A montagem usou a IA da Aikortex. Para <strong>testar e publicar</strong>, seu agente
            roda na <strong>sua própria chave</strong> — escolha o provedor e o modelo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Provedor de IA</Label>
            <Select value={provider} onValueChange={handleProvider}>
              <SelectTrigger><SelectValue placeholder="Escolha o provedor" /></SelectTrigger>
              <SelectContent>
                {GATE_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}{connected.has(p.id) ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="ex: gpt-4o"
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {suggestions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      model === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {provider && (
            hasKey ? (
              <div className="flex items-center gap-2 text-[13px] text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Chave conectada para este provedor.
              </div>
            ) : (
              <div className="flex items-start gap-2 text-[13px] text-amber-600">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Você ainda não conectou a chave da {GATE_PROVIDERS.find((p) => p.id === provider)?.label}.{" "}
                  <Link
                    to="/settings?tab=providers"
                    className="underline inline-flex items-center gap-0.5 font-medium"
                    onClick={() => onOpenChange(false)}
                  >
                    Conectar em Provedores <ExternalLink className="w-3 h-3" />
                  </Link>
                </span>
              </div>
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!canTest || saving}>
            {saving ? "Salvando…" : "Testar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
