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
import { Loader2, Save, Sparkles, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Stark — Funções da plataforma</h2>
          <p className="text-xs text-muted-foreground">
            O que você desligar aqui some pra <span className="font-semibold">todas as agências</span>.
            O que estiver ligado, cada agência ainda pode desligar pra si.
          </p>
        </div>
      </div>

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
