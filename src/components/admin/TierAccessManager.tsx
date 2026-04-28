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

const TIERS = ["starter", "explorer", "hack"] as const;
type Tier = (typeof TIERS)[number];

const TIER_COLORS: Record<Tier, string> = {
  starter: "bg-amber-700/10 text-amber-700 border-amber-700/20",
  explorer: "bg-slate-400/10 text-slate-500 border-slate-400/20",
  hack: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
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
    group: "Aikortex",
    modules: [
      {
        key: "aikortex.agentes", label: "Agentes",
        subFeatures: [
          { key: "template_sdr", label: "Template SDR" },
          { key: "template_sac", label: "Template SAC" },
          { key: "custom", label: "Agente Personalizado" },
          { key: "voice", label: "Agente de Voz" },
          { key: "llm_swap", label: "Troca de LLM" },
        ],
      },
      {
        key: "aikortex.flows", label: "Flows",
        subFeatures: [
          { key: "comercial", label: "Templates Comerciais" },
          { key: "atendimento", label: "Templates Atendimento" },
          { key: "custom", label: "Fluxo em branco" },
        ],
      },
      {
        key: "aikortex.apps", label: "Apps",
        subFeatures: [
          { key: "web", label: "Apps Web" },
          { key: "whatsapp", label: "Apps WhatsApp" },
        ],
      },
      { key: "aikortex.templates", label: "Templates" },
      {
        key: "aikortex.mensagens", label: "Mensagens",
        subFeatures: [
          { key: "whatsapp", label: "WhatsApp" },
          { key: "email", label: "E-mail" },
          { key: "webchat", label: "Web Chat" },
        ],
      },
      {
        key: "aikortex.disparos", label: "Disparos",
        subFeatures: [
          { key: "whatsapp", label: "Disparos WhatsApp" },
          { key: "email", label: "Disparos E-mail" },
        ],
      },
    ],
  },
  {
    group: "Gestão",
    modules: [
      { key: "gestao.clientes", label: "Clientes" },
      { key: "gestao.contratos", label: "Contratos" },
      { key: "gestao.vendas", label: "Vendas" },
      {
        key: "gestao.crm", label: "CRM",
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
  starter: {
    "aikortex.agentes": true, "aikortex.flows": false, "aikortex.apps": false,
    "aikortex.templates": true, "aikortex.mensagens": true, "aikortex.disparos": false,
    "gestao.clientes": true, "gestao.contratos": false, "gestao.vendas": true,
    "gestao.crm": false, "gestao.reunioes": false, "gestao.financeiro": false,
    "gestao.equipe": true, "gestao.tarefas": true,
  },
  explorer: {
    "aikortex.agentes": true, "aikortex.flows": true, "aikortex.apps": false,
    "aikortex.templates": true, "aikortex.mensagens": true, "aikortex.disparos": true,
    "gestao.clientes": true, "gestao.contratos": true, "gestao.vendas": true,
    "gestao.crm": true, "gestao.reunioes": false, "gestao.financeiro": true,
    "gestao.equipe": true, "gestao.tarefas": true,
  },
  hack: Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, true])),
};

interface AccessRow {
  id: string;
  tier: string;
  module_key: string;
  has_access: boolean;
  sub_features: Record<string, boolean>;
}

const TierAccessManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

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

  // Build maps
  const accessMap: Record<string, Record<string, boolean>> = {};
  const subFeaturesMap: Record<string, Record<string, Record<string, boolean>>> = {};
  for (const tier of TIERS) {
    accessMap[tier] = {};
    subFeaturesMap[tier] = {};
  }
  if (rows) {
    for (const row of rows) {
      if (!accessMap[row.tier]) accessMap[row.tier] = {};
      if (!subFeaturesMap[row.tier]) subFeaturesMap[row.tier] = {};
      accessMap[row.tier][row.module_key] = row.has_access;
      subFeaturesMap[row.tier][row.module_key] = (row.sub_features && typeof row.sub_features === "object")
        ? row.sub_features as Record<string, boolean>
        : {};
    }
  }

  const toggleMutation = useMutation({
    mutationFn: async ({ tier, moduleKey, value }: { tier: string; moduleKey: string; value: boolean }) => {
      const { error } = await supabase
        .from("tier_module_access")
        .update({ has_access: value, updated_by: user?.id })
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
      // Enable for this tier and all higher tiers
      const tierIdx = TIERS.indexOf(tier as Tier);
      for (let i = tierIdx; i < TIERS.length; i++) {
        const t = TIERS[i];
        if (!accessMap[t]?.[moduleKey]) {
          toggleMutation.mutate({ tier: t, moduleKey, value: true });
        }
      }
    } else {
      toggleMutation.mutate({ tier, moduleKey, value: false });
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
          .update({ has_access: defaultVal, updated_by: user?.id, sub_features: {} as any })
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
    ALL_MODULE_KEYS.filter((k) => accessMap[tier]?.[k]).length;

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
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                        {TIERS.map((tier) => (
                          <td key={tier} className="px-4 py-2.5 text-center">
                            <Switch
                              checked={accessMap[tier]?.[mod.key] ?? false}
                              onCheckedChange={(val) => handleToggle(tier, mod.key, val)}
                              disabled={toggleMutation.isPending}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Sub-features expanded row */}
                      {isExpanded && hasSubFeatures && (
                        <tr className="bg-primary/5 border-b border-border/50">
                          <td colSpan={4} className="px-4 py-3">
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
