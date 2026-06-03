import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useHubSpotSyncConfig, useUpsertHubSpotSyncConfig, useCrmStages } from "@/hooks/use-crm";

// Stages padrão do HubSpot default pipeline. User pode trocar pelo ID real do
// seu pipeline customizado se tiver.
const DEFAULT_HUBSPOT_STAGES: Array<{ slug: string; label: string }> = [
  { slug: "appointmentscheduled", label: "Appointment Scheduled" },
  { slug: "qualifiedtobuy", label: "Qualified to Buy" },
  { slug: "presentationscheduled", label: "Presentation Scheduled" },
  { slug: "decisionmakerboughtin", label: "Decision Maker Bought In" },
  { slug: "contractsent", label: "Contract Sent" },
  { slug: "closedwon", label: "Closed Won" },
  { slug: "closedlost", label: "Closed Lost" },
];

export function HubSpotSyncSettings() {
  const { data: config } = useHubSpotSyncConfig();
  const { data: stages } = useCrmStages();
  const upsert = useUpsertHubSpotSyncConfig();

  const [enabled, setEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [pipelineId, setPipelineId] = useState("default");
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setAutoSync(config.auto_sync);
    setPipelineId(config.hubspot_pipeline_id ?? "default");
    setMapping(config.stage_mapping ?? {});
  }, [config]);

  // Quando stages carregarem e mapping estiver vazio, pré-popula sugestão
  useEffect(() => {
    if (!stages || stages.length === 0) return;
    if (Object.keys(mapping).length > 0) return;
    const suggested: Record<string, string> = {};
    for (const s of stages) {
      const guess =
        s.slug === "new" ? "appointmentscheduled" :
        s.slug === "contacted" ? "appointmentscheduled" :
        s.slug === "qualified" ? "qualifiedtobuy" :
        s.slug === "meeting_scheduled" ? "presentationscheduled" :
        s.slug === "won" ? "closedwon" :
        s.slug === "lost" ? "closedlost" :
        "";
      if (guess) suggested[s.slug] = guess;
    }
    setMapping(suggested);
  }, [stages, mapping]);

  const handleSave = () => {
    upsert.mutate({
      enabled,
      auto_sync: autoSync,
      hubspot_pipeline_id: pipelineId,
      stage_mapping: mapping,
    });
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">HubSpot Sync</h3>
            {config?.enabled && (
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3" /> Ativo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Espelha contatos e deals do CRM Aikortex pro seu HubSpot. Requer HubSpot conectado em Conectores.
          </p>
        </div>
      </div>

      {config?.last_sync_error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-destructive">Último erro de sync:</p>
            <p className="text-muted-foreground break-words">{config.last_sync_error}</p>
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Sync ativo</p>
            <p className="text-xs text-muted-foreground">Liga/desliga a integração com HubSpot.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>

        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Auto-sync</p>
            <p className="text-xs text-muted-foreground">
              Sincroniza automaticamente em toda mudança de contato (Sprint 2.2).
              Por enquanto sync é manual via botão no Detail.
            </p>
          </div>
          <Switch checked={autoSync} onCheckedChange={setAutoSync} disabled />
        </label>
      </div>

      {/* Pipeline */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Pipeline HubSpot</label>
        <Input
          value={pipelineId}
          onChange={(e) => setPipelineId(e.target.value)}
          placeholder='ID do pipeline (use "default" pra o padrão)'
          className="h-9 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Pega o ID em HubSpot → Settings → Objects → Deals → Pipelines. "default" funciona pra contas sem pipelines customizados.
        </p>
      </div>

      {/* Stage Mapping */}
      {stages && stages.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Mapping de stages</label>
          <p className="text-[10px] text-muted-foreground">
            Mapeie cada stage do Aikortex pra um dealstage do HubSpot. Stages não mapeados não criam Deal (apenas sincroniza o Contact).
          </p>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {stages.map((s) => (
              <div key={s.id} className="grid grid-cols-2 gap-2 items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-medium">{s.name}</span>
                </div>
                <Input
                  value={mapping[s.slug] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [s.slug]: e.target.value })}
                  placeholder={DEFAULT_HUBSPOT_STAGES.find((h) => h.slug === mapping[s.slug])?.label ?? "ex: qualifiedtobuy"}
                  className="h-8 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {config?.last_sync_at && (
        <p className="text-[10px] text-muted-foreground">
          Última sync: {new Date(config.last_sync_at).toLocaleString("pt-BR")} · Total sincronizado: {config.total_synced}
        </p>
      )}

      <div className="flex justify-end pt-2 border-t border-border/40">
        <Button size="sm" onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${upsert.isPending ? "animate-spin" : ""}`} />
          Salvar
        </Button>
      </div>
    </Card>
  );
}
