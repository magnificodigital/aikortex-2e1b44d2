/**
 * AdminStarkTab — kill-switch global das funções do Stark.
 *
 * O que o admin desligar aqui MORRE pra todas as agências (nem aparece
 * nas Settings delas e o Stark Agent remove a tool do LLM). O que estiver
 * ligado, cada agência ainda pode desligar pra si.
 *
 * Persistido em platform_config key='stark_tools_enabled' (JSON).
 */
import { useEffect, useState } from "react";
import { Loader2, Save, Zap, ShieldAlert, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStarkPlatformTools } from "@/hooks/use-stark-platform-tools";
import { STARK_TOOL_CATALOG, STARK_TOOL_GROUPS } from "@/lib/stark-tools-catalog";
import { toast } from "sonner";

export default function AdminStarkTab() {
  const { platformTools, loading, saving, save } = useStarkPlatformTools();
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (loading) return;
    const map: Record<string, boolean> = {};
    STARK_TOOL_CATALOG.forEach(t => {
      map[t.id] = platformTools[t.id] !== false;
    });
    setDraft(map);
  }, [loading, platformTools]);

  const dirty = STARK_TOOL_CATALOG.some(
    t => (draft[t.id] ?? true) !== (platformTools[t.id] !== false),
  );

  async function onSave() {
    // So persiste os FALSE (ausente = liberado) — mantem o JSON enxuto.
    const next: Record<string, boolean> = {};
    STARK_TOOL_CATALOG.forEach(t => {
      if (draft[t.id] === false) next[t.id] = false;
    });
    const ok = await save(next);
    if (ok) toast.success("Funções do Stark atualizadas pra toda a plataforma");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const disabledCount = STARK_TOOL_CATALOG.filter(t => draft[t.id] === false).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Stark — Funções da plataforma</h2>
          <p className="text-xs text-muted-foreground">
            O que você desligar aqui some pra <span className="font-semibold">todas as agências</span>.
            O que estiver ligado, cada agência ainda pode desligar pra si.
          </p>
        </div>
      </div>

      <ResalePriceCard />

      {disabledCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-200">
            {disabledCount} {disabledCount === 1 ? "função bloqueada" : "funções bloqueadas"} globalmente.
          </p>
        </div>
      )}

      {STARK_TOOL_GROUPS.map(g => (
        <Card key={g}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{g}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {STARK_TOOL_CATALOG.filter(t => t.group === g).map(t => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {t.label}
                    {t.write && <Badge variant="outline" className="text-[9px] uppercase">ação</Badge>}
                    {draft[t.id] === false && (
                      <Badge variant="destructive" className="text-[9px] uppercase">bloqueada</Badge>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 font-mono">{t.id}</p>
                </div>
                <Switch
                  checked={draft[t.id] ?? true}
                  onCheckedChange={(v) => setDraft(prev => ({ ...prev, [t.id]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between sticky bottom-4 rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-xs text-muted-foreground">
          <Label className="text-xs">Vale pra novas sessões de voz — sessões abertas continuam até desconectar.</Label>
        </p>
        <Button size="sm" className="gap-1.5" onClick={onSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar pra plataforma
        </Button>
      </div>
    </div>
  );
}

/** Preço base da revenda do Stark — a agência vende por >= esse valor;
 *  o base vira fixedValue do split Asaas (fica com a Aikortex). */
function ResalePriceCard() {
  const [price, setPrice] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase.from("platform_config" as any) as any)
          .select("value")
          .eq("key", "stark_resale")
          .maybeSingle();
        const parsed = data?.value ? JSON.parse(data.value) : {};
        const v = String(parsed.base_price_monthly ?? 97);
        setPrice(v); setSaved(v);
      } catch {
        setPrice("97"); setSaved("97");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    const n = parseFloat(price.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) { toast.error("Preço inválido"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("platform_config" as any) as any)
        .upsert({
          key: "stark_resale",
          value: JSON.stringify({ base_price_monthly: n }),
          description: "Revenda do Stark: preco base mensal em reais (fixedValue do split Asaas)",
          is_secret: false,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        }, { onConflict: "key" });
      if (error) { toast.error(`Erro: ${error.message}`); return; }
      setSaved(price);
      toast.success(`Preço base do Stark: R$ ${n.toFixed(2)}/mês`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Revenda do Stark
        </CardTitle>
        <CardDescription className="text-xs">
          Preço base mensal (sua parte, via split Asaas). A agência define o preço
          de venda pro cliente final — nunca abaixo do base.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Preço base (R$/mês)</Label>
          <Input
            value={loading ? "…" : price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={loading}
            className="w-36"
            inputMode="decimal"
          />
        </div>
        <Button size="sm" className="gap-1.5" onClick={onSave} disabled={loading || saving || price === saved}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
