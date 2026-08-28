import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2, RotateCcw, ShieldCheck, ChevronDown, ChevronRight, Settings2,
} from "lucide-react";

// Alinhado ao Master v7.4 §3.2: Start (gratuito) → Hack (R$197) → Growth (R$397)
const TIERS = ["start", "hack", "growth"] as const;
type Tier = (typeof TIERS)[number];

const TIER_COLORS: Record<Tier, string> = {
  start: "bg-amber-700/10 text-amber-700 border-amber-700/20",
  hack: "bg-slate-400/10 text-slate-500 border-slate-400/20",
  growth: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

interface SubFeatureDef {
  key: string;
  label: string;
}

interface ModuleDef {
  key: string;
  label: string;
  subFeatures?: SubFeatureDef[];
}

const MODULE_GROUPS: { group: string; modules: ModuleDef[] }[] = [
  {
    group: "Geral",
    modules: [
      {
        key: "stark.copilot", label: "Stark",
        subFeatures: [
          { key: "planning", label: "Planejamento" },
          { key: "reasoning", label: "Raciocínio avançado" },
          { key: "code_runtime", label: "Execução de código" },
          { key: "memory", label: "Memória" },
          { key: "auto_integration", label: "Integração automática" },
        ],
      },
      { key: "dashboard", label: "Dashboard" },
    ],
  },
  {
    group: "Aikortex",
    modules: [
      {
        key: "aikortex.agentes", label: "Agentes",
        subFeatures: [
          { key: "templates", label: "Templates prontos (SDR/SAC)" },
          { key: "custom", label: "Agente personalizado" },
          { key: "voice", label: "Agente de voz" },
          { key: "llm_swap", label: "Troca de LLM" },
        ],
      },
      { key: "aikortex.mensagens", label: "Mensagens" },
      {
        key: "aikortex.ligacoes", label: "Ligações",
        subFeatures: [
          { key: "outbound", label: "Ligações ativas" },
          { key: "inbound", label: "Ligações receptivas" },
        ],
      },
      {
        key: "aikortex.apps", label: "Apps",
        subFeatures: [
          { key: "web", label: "Apps Web" },
          { key: "whatsapp", label: "Apps WhatsApp" },
        ],
      },
    ],
  },
  {
    group: "Canais & Conectores",
    modules: [
      {
        key: "canais", label: "Canais",
        subFeatures: [
          { key: "whatsapp", label: "WhatsApp" },
          { key: "instagram", label: "Instagram" },
          { key: "email", label: "E-mail" },
          { key: "website", label: "Website / Web Chat" },
          { key: "voice", label: "Voz (ligações)" },
        ],
      },
      {
        key: "conectores", label: "Conectores",
        subFeatures: [
          { key: "gmail", label: "Gmail" },
          { key: "google_calendar", label: "Google Agenda" },
          { key: "outlook", label: "Outlook" },
          { key: "hubspot", label: "HubSpot" },
          { key: "slack", label: "Slack" },
          { key: "notion", label: "Notion" },
        ],
      },
    ],
  },
  {
    group: "Gestão",
    modules: [
      { key: "gestao.clientes", label: "Clientes" },
      {
        key: "gestao.vendas", label: "Vendas (CRM)",
        subFeatures: [
          { key: "kanban", label: "Kanban" },
          { key: "lead_scoring", label: "Lead Scoring" },
        ],
      },
      {
        key: "gestao.reunioes", label: "Reuniões",
        subFeatures: [
          { key: "video", label: "Videochamadas" },
          { key: "gravacao", label: "Gravação" },
          { key: "traducao", label: "Tradução em tempo real" },
        ],
      },
      {
        key: "gestao.financeiro", label: "Financeiro",
        subFeatures: [
          { key: "faturas", label: "Faturas" },
          { key: "despesas", label: "Despesas" },
          { key: "fluxo_caixa", label: "Fluxo de caixa" },
        ],
      },
      { key: "gestao.equipe", label: "Equipe" },
      { key: "gestao.tarefas", label: "Tarefas" },
    ],
  },
];

const ALL_MODULE_KEYS = MODULE_GROUPS.flatMap((g) => g.modules.map((m) => m.key));
const TOTAL_MODULES = ALL_MODULE_KEYS.length;

const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  start: {
    "stark.copilot": true, "dashboard": true, "aikortex.agentes": true, "aikortex.mensagens": true,
    "aikortex.ligacoes": false, "aikortex.apps": false,
    "canais": true, "conectores": false,
    "gestao.clientes": true, "gestao.vendas": true, "gestao.reunioes": false,
    "gestao.financeiro": false, "gestao.equipe": true, "gestao.tarefas": true,
  },
  hack: {
    "stark.copilot": true, "dashboard": true, "aikortex.agentes": true, "aikortex.mensagens": true,
    "aikortex.ligacoes": true, "aikortex.apps": true,
    "canais": true, "conectores": true,
    "gestao.clientes": true, "gestao.vendas": true, "gestao.reunioes": true,
    "gestao.financeiro": true, "gestao.equipe": true, "gestao.tarefas": true,
  },
  growth: Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, true])),
};

interface AccessRow {
  id: string;
  tier: string;
  module_key: string;
  has_access: boolean;
  can_offer_client: boolean;
  sub_features: Record<string, boolean>;
}

// Duas dimensões: o que a AGÊNCIA usa (has_access) e o que ela pode LIBERAR
// pro cliente (can_offer_client).
type AccessMode = "agency" | "client";

const TierAccessManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [mode, setMode] = useState<AccessMode>("agency");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["tier-module-access-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_module_access")
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as AccessRow[];
    },
  });

  // Flags GLOBAIS (a função existe/ativa na plataforma, independente do tier).
  const { data: flagRows } = useQuery({
    queryKey: ["platform-module-flags-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_module_flags").select("module_key, active");
      if (error) throw error;
      return (data ?? []) as { module_key: string; active: boolean }[];
    },
  });
  const flagsMap: Record<string, boolean> = {};
  if (flagRows) for (const r of flagRows) flagsMap[r.module_key] = r.active;
  const isActive = (key: string) => flagsMap[key] ?? true;

  const flagMutation = useMutation({
    mutationFn: async ({ moduleKey, value }: { moduleKey: string; value: boolean }) => {
      const { error } = await supabase
        .from("platform_module_flags")
        .upsert({ module_key: moduleKey, active: value, updated_by: user?.id, updated_at: new Date().toISOString() }, { onConflict: "module_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-module-flags-admin"] });
      queryClient.invalidateQueries({ queryKey: ["platform-module-flags"] });
      toast.success("Funcionalidade atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  // Build maps
  const accessMap: Record<string, Record<string, boolean>> = {};
  const offerMap: Record<string, Record<string, boolean>> = {};
  const subFeaturesMap: Record<string, Record<string, Record<string, boolean>>> = {};
  for (const tier of TIERS) {
    accessMap[tier] = {};
    offerMap[tier] = {};
    subFeaturesMap[tier] = {};
  }
  if (rows) {
    for (const row of rows) {
      if (!accessMap[row.tier]) accessMap[row.tier] = {};
      if (!offerMap[row.tier]) offerMap[row.tier] = {};
      if (!subFeaturesMap[row.tier]) subFeaturesMap[row.tier] = {};
      accessMap[row.tier][row.module_key] = row.has_access;
      offerMap[row.tier][row.module_key] = (row as any).can_offer_client ?? false;
      subFeaturesMap[row.tier][row.module_key] = (row.sub_features && typeof row.sub_features === "object")
        ? row.sub_features as Record<string, boolean>
        : {};
    }
  }

  // Mapa/coluna ativos conforme o modo selecionado.
  const currentMap = mode === "agency" ? accessMap : offerMap;
  const currentColumn = mode === "agency" ? "has_access" : "can_offer_client";

  const toggleMutation = useMutation({
    mutationFn: async ({ tier, moduleKey, value, column }: { tier: string; moduleKey: string; value: boolean; column: string }) => {
      const { error } = await supabase
        .from("tier_module_access")
        .update({ [column]: value, updated_by: user?.id })
        .eq("tier", tier)
        .eq("module_key", moduleKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-module-access-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tier-module-access"] });
      queryClient.invalidateQueries({ queryKey: ["tier-module-access-all"] });
      toast.success("Acesso atualizado");
    },
    onError: () => toast.error("Erro ao atualizar acesso"),
  });

  const subFeatureMutation = useMutation({
    mutationFn: async ({ tier, moduleKey, subFeatures }: { tier: string; moduleKey: string; subFeatures: Record<string, boolean> }) => {
      const { error } = await supabase
        .from("tier_module_access")
        .update({ sub_features: subFeatures as any, updated_by: user?.id })
        .eq("tier", tier)
        .eq("module_key", moduleKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-module-access-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tier-module-access"] });
      queryClient.invalidateQueries({ queryKey: ["tier-module-access-all"] });
      toast.success("Sub-funcionalidade atualizada");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const handleToggle = (tier: string, moduleKey: string, newValue: boolean) => {
    if (newValue) {
      // Ligar neste tier e nos superiores (tiers maiores herdam ao menos isso).
      const tierIdx = TIERS.indexOf(tier as Tier);
      for (let i = tierIdx; i < TIERS.length; i++) {
        const t = TIERS[i];
        if (!currentMap[t]?.[moduleKey]) {
          toggleMutation.mutate({ tier: t, moduleKey, value: true, column: currentColumn });
        }
      }
    } else {
      toggleMutation.mutate({ tier, moduleKey, value: false, column: currentColumn });
    }
  };

  const handleSubFeatureToggle = (tier: string, moduleKey: string, subKey: string, value: boolean) => {
    const current = subFeaturesMap[tier]?.[moduleKey] ?? {};
    const updated = { ...current, [subKey]: value };
    subFeatureMutation.mutate({ tier, moduleKey, subFeatures: updated });
  };

  const handleResetDefaults = async () => {
    if (!confirm("Restaurar configurações padrão para todos os tiers?")) return;
    for (const tier of TIERS) {
      for (const key of ALL_MODULE_KEYS) {
        const defaultVal = DEFAULT_ACCESS[tier]?.[key] ?? false;
        await supabase
          .from("tier_module_access")
          .update({ has_access: defaultVal, can_offer_client: defaultVal, updated_by: user?.id, sub_features: {} as any })
          .eq("tier", tier)
          .eq("module_key", key);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["tier-module-access-admin"] });
    queryClient.invalidateQueries({ queryKey: ["tier-module-access"] });
    queryClient.invalidateQueries({ queryKey: ["tier-module-access-all"] });
    toast.success("Padrões restaurados");
  };

  const countEnabled = (tier: string) =>
    ALL_MODULE_KEYS.filter((k) => currentMap[tier]?.[k]).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Funcionalidades por Tier</h2>
          <p className="text-xs text-muted-foreground">
            Configure quais módulos e sub-funcionalidades cada tier pode acessar.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrões
        </Button>
      </div>

      {/* Seletor de dimensão: uso da agência x liberável ao cliente */}
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
        <button
          onClick={() => setMode("agency")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "agency" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          O que a agência usa
        </button>
        <button
          onClick={() => setMode("client")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "client" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          O que pode liberar ao cliente
        </button>
      </div>

      {/* Tier summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const enabled = countEnabled(tier);
          const pct = Math.round((enabled / TOTAL_MODULES) * 100);
          return (
            <Card key={tier} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`capitalize text-[10px] ${TIER_COLORS[tier]}`}>{tier}</Badge>
              </div>
              <p className="text-sm font-medium text-foreground">
                {enabled} de {TOTAL_MODULES} módulos
              </p>
              <Progress value={pct} className="h-1.5" />
            </Card>
          );
        })}
      </div>

      {/* Matrix table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Módulo</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs">Ativo</th>
              {TIERS.map((tier) => (
                <th key={tier} className="px-4 py-3 text-center">
                  <Badge className={`capitalize text-[10px] ${TIER_COLORS[tier]}`}>{tier}</Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_GROUPS.map((group) => (
              <React.Fragment key={group.group}>
                <tr className="bg-muted/10">
                  <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.group}
                  </td>
                </tr>
                {group.modules.map((mod) => {
                  const isExpanded = expandedModule === mod.key;
                  const hasSubFeatures = mod.subFeatures && mod.subFeatures.length > 0;

                  return (
                    <React.Fragment key={mod.key}>
                      <tr
                        className={`border-b border-border/50 transition-colors ${
                          isExpanded ? "bg-primary/5" : "hover:bg-muted/20"
                        } ${hasSubFeatures ? "cursor-pointer" : ""}`}
                      >
                        <td
                          className="px-4 py-2.5 font-medium text-foreground"
                          onClick={() => hasSubFeatures && setExpandedModule(isExpanded ? null : mod.key)}
                        >
                          <div className="flex items-center gap-2">
                            {hasSubFeatures && (
                              isExpanded
                                ? <ChevronDown className="w-3.5 h-3.5 text-primary" />
                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span>{mod.label}</span>
                            {hasSubFeatures && (
                              <Settings2 className="w-3 h-3 text-muted-foreground/50" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center border-r border-border/50">
                          <Switch
                            checked={isActive(mod.key)}
                            onCheckedChange={(val) => flagMutation.mutate({ moduleKey: mod.key, value: val })}
                            disabled={flagMutation.isPending}
                          />
                        </td>
                        {TIERS.map((tier) => (
                          <td key={tier} className="px-4 py-2.5 text-center">
                            <Switch
                              checked={isActive(mod.key) && (currentMap[tier]?.[mod.key] ?? false)}
                              onCheckedChange={(val) => handleToggle(tier, mod.key, val)}
                              disabled={toggleMutation.isPending || !isActive(mod.key)}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Sub-features expanded row */}
                      {isExpanded && hasSubFeatures && (
                        <tr className="bg-primary/5 border-b border-border/50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="ml-6 space-y-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Sub-funcionalidades de {mod.label}
                              </p>
                              <div className="rounded-lg border border-border/60 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/20">
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Funcionalidade</th>
                                      {TIERS.map((t) => (
                                        <th key={t} className="px-3 py-2 text-center">
                                          <Badge className={`capitalize text-[9px] ${TIER_COLORS[t]}`}>{t}</Badge>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mod.subFeatures!.map((sf) => (
                                      <tr key={sf.key} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                                        <td className="px-3 py-2 text-foreground">{sf.label}</td>
                                        {TIERS.map((tier) => {
                                          const moduleEnabled = accessMap[tier]?.[mod.key] ?? false;
                                          const subEnabled = subFeaturesMap[tier]?.[mod.key]?.[sf.key] ?? false;
                                          return (
                                            <td key={tier} className="px-3 py-2 text-center">
                                              <Checkbox
                                                checked={subEnabled}
                                                onCheckedChange={(val) =>
                                                  handleSubFeatureToggle(tier, mod.key, sf.key, !!val)
                                                }
                                                disabled={!moduleEnabled || subFeatureMutation.isPending}
                                                className="mx-auto"
                                              />
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TierAccessManager;
