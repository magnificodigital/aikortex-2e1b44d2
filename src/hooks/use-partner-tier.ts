import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type FeatureFlag, type PartnerTier, TIER_FEATURE_CONFIG } from "@/types/rbac";
import { TIER_CONFIG } from "@/types/partner";
import type { Tables } from "@/integrations/supabase/types";

const TIERS: PartnerTier[] = ["starter", "explorer", "hack"];

// Map FeatureFlag keys to tier_module_access module_key values in DB
const FEATURE_TO_MODULE_KEY: Record<string, string> = {
  "module.agents": "aikortex.agentes",
  "module.flows": "aikortex.flows",
  "module.apps": "aikortex.apps",
  "module.templates": "aikortex.templates",
  "module.messages": "aikortex.mensagens",
  "module.broadcasts": "aikortex.disparos",
  "module.clients": "gestao.clientes",
  "module.contracts": "gestao.contratos",
  "module.sales": "gestao.vendas",
  "module.crm": "gestao.crm",
  "module.meetings": "gestao.reunioes",
  "module.financial": "gestao.financeiro",
  "module.team": "gestao.equipe",
  "module.tasks": "gestao.tarefas",
};

type TierModuleAccessRow = Pick<Tables<"tier_module_access">, "tier" | "module_key" | "has_access">;

export interface PartnerTierData {
  id: string;
  user_id: string;
  tier: PartnerTier;
  clients_served: number;
  revenue: number;
  solutions_published: number;
  certifications_earned: number;
  tier_upgraded_at: string;
  notes: string | null;
}

export interface TierProgress {
  clients: number;
  revenue: number;
  solutions: number;
  certs: number;
}

export function usePartnerTier() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading: tierLoading } = useQuery({
    queryKey: ["partner-tier", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Try to fetch existing tier
      const { data: existing, error } = await supabase
        .from("partner_tiers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (existing) return existing as PartnerTierData;

      // Auto-create starter tier on first access
      const { data: created, error: insertError } = await supabase
        .from("partner_tiers")
        .insert({ user_id: user!.id, tier: "starter" })
        .select()
        .single();

      if (insertError) throw insertError;
      return created as PartnerTierData;
    },
  });

  const tier: PartnerTier = (data?.tier as PartnerTier) ?? "starter";
  const tierIdx = TIERS.indexOf(tier);
  const nextTier = tierIdx < TIERS.length - 1 ? TIERS[tierIdx + 1] : null;

  // Query tier_module_access from DB for the user's tier
  const { data: allAccessRows, isLoading: accessLoading } = useQuery({
    queryKey: ["tier-module-access-all"],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("tier_module_access")
        .select("tier, module_key, has_access");
      if (error) throw error;
      return (rows ?? []) as TierModuleAccessRow[];
    },
  });

  // Build access map per tier
  const tierAccessMap: Record<string, Record<string, boolean>> = {};
  if (allAccessRows) {
    for (const row of allAccessRows) {
      if (!tierAccessMap[row.tier]) tierAccessMap[row.tier] = {};
      tierAccessMap[row.tier][row.module_key] = row.has_access;
    }
  }

  const hasFeature = (flag: FeatureFlag): boolean => {
    const moduleKey = FEATURE_TO_MODULE_KEY[flag];
    if (!moduleKey) {
      // For non-module features (e.g. feature.saas_builder), use static tier config
      return TIER_FEATURE_CONFIG[tier]?.features.includes(flag) ?? false;
    }
    if (!allAccessRows) return true; // still loading, don't block
    return tierAccessMap[tier]?.[moduleKey] ?? false;
  };

  const getMinTierForFeature = (flag: FeatureFlag): PartnerTier | null => {
    const moduleKey = FEATURE_TO_MODULE_KEY[flag];
    if (!moduleKey) {
      // For non-module features, check static config
      for (const t of TIERS) {
        if (TIER_FEATURE_CONFIG[t]?.features.includes(flag)) return t;
      }
      return null;
    }
    for (const t of TIERS) {
      if (tierAccessMap[t]?.[moduleKey]) return t;
    }
    return null;
  };

  const progressToNextTier: TierProgress | null = nextTier
    ? (() => {
        const cfg = TIER_CONFIG[nextTier];
        const d = data;
        return {
          clients: cfg.minClients > 0 ? Math.min(100, ((d?.clients_served ?? 0) / cfg.minClients) * 100) : 100,
          revenue: cfg.minRevenue > 0 ? Math.min(100, ((d?.revenue ?? 0) / cfg.minRevenue) * 100) : 100,
          solutions: cfg.minSolutions > 0 ? Math.min(100, ((d?.solutions_published ?? 0) / cfg.minSolutions) * 100) : 100,
          certs: cfg.minCerts > 0 ? Math.min(100, ((d?.certifications_earned ?? 0) / cfg.minCerts) * 100) : 100,
        };
      })()
    : null;

  const updateMetrics = useMutation({
    mutationFn: async (metrics: Partial<Pick<PartnerTierData, "clients_served" | "revenue" | "solutions_published" | "certifications_earned">>) => {
      const { error } = await supabase
        .from("partner_tiers")
        .update(metrics)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-tier", user?.id] }),
  });

  return {
    tier,
    data,
    isLoading: tierLoading || accessLoading,
    hasFeature,
    getMinTierForFeature,
    nextTier,
    progressToNextTier,
    updateMetrics,
  };
}