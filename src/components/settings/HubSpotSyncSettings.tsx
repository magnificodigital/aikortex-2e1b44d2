import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle2, ChevronDown, Settings2 } from "lucide-react";
import { useHubSpotSyncConfig, useUpsertHubSpotSyncConfig, useCrmStages } from "@/hooks/use-crm";

/**
 * Settings de sync com CRM Aikortex — versão inline pra usar dentro do dialog
 * "Gerenciar HubSpot" do IntegrationsGrid. Foco em ser scaneável:
 * - Toggle principal grande
 * - Status (último sync, total)
 * - "Configurações avançadas" colapsado por default (pipeline + mapping)
 */
export function HubSpotSyncSettings() {
  const { data: config } = useHubSpotSyncConfig();
  const { data: stages } = useCrmStages();
  const upsert = useUpsertHubSpotSyncConfig();

  const [enabled, setEnabled] = useState(false);
  const [pipelineId, setPipelineId] = useState("default");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setPipelineId(config.hubspot_pipeline_id ?? "default");
    setMapping(config.stage_mapping ?? {});
    setDirty(false);
  }, [config]);

  useEffect(() => {
    if (!stages || stages.length === 0 || Object.keys(mapping).length > 0) return;
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
    upsert.mutate(
      { enabled, hubspot_pipeline_id: pipelineId, stage_mapping: mapping },
      { onSuccess: () => setDirty(false) },
    );
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Sincronizar com CRM Aikortex</p>
            {config?.enabled && (
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3" /> Ativo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Espelha contatos e deals do CRM Aikortex pro seu HubSpot.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => { setEnabled(v); setDirty(true); }}
        />
      </div>

      {config?.last_sync_error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <div className="text-[11px]">
            <p className="font-medium text-destructive">Último erro de sync</p>
            <p className="text-muted-foreground break-words">{config.last_sync_error}</p>
          </div>
        </div>
      )}

      {config?.last_sync_at && (
        <p className="text-[10px] text-muted-foreground">
          Última sync: {new Date(config.last_sync_at).toLocaleString("pt-BR")} · {config.total_synced} sincronizados
        </p>
      )}

      {/* Avançado */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="w-3 h-3" />
          Configurações avançadas
          <ChevronDown className={`w-3 h-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Pipeline HubSpot</label>
            <Input
              value={pipelineId}
              onChange={(e) => { setPipelineId(e.target.value); setDirty(true); }}
              placeholder='"default" funciona pra contas padrão'
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              ID em HubSpot → Settings → Objects → Deals → Pipelines.
            </p>
          </div>

          {stages && stages.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Mapping de stages → HubSpot dealstages</label>
              <div className="space-y-1.5">
                {stages.map((s) => (
                  <div key={s.id} className="grid grid-cols-[1fr_1fr] gap-2 items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-[11px]">{s.name}</span>
                    </div>
                    <Input
                      value={mapping[s.slug] ?? ""}
                      onChange={(e) => { setMapping({ ...mapping, [s.slug]: e.target.value }); setDirty(true); }}
                      placeholder="—"
                      className="h-7 text-[11px] font-mono"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Stages sem mapping sincronizam só o Contact (sem Deal).
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
