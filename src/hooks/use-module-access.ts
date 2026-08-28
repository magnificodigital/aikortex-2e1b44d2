import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { usePartnerTier } from "@/hooks/use-partner-tier";

type TierModuleRow = Pick<Tables<"tier_module_access">, "tier" | "module_key" | "has_access">;

export function useModuleAccess() {
  const { user, isPlatform } = useAuth();
  const { tier, isLoading: tierLoading } = usePartnerTier();

  const { data: accessRows, isLoading: accessLoading } = useQuery({
    queryKey: ["tier-module-access", tier],
    enabled: !!user && !isPlatform && !!tier,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_module_access")
        .select("tier, module_key, has_access")
        .eq("tier", tier);
      if (error) throw error;
      return (data ?? []) as TierModuleRow[];
    },
  });

  // Master GLOBAL: função ativa/desativada na plataforma (independe do tier).
  const { data: flagRows } = useQuery({
    queryKey: ["platform-module-flags"],
    enabled: !!user && !isPlatform,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_module_flags").select("module_key, active");
      if (error) throw error;
      return (data ?? []) as { module_key: string; active: boolean }[];
    },
  });
  const flagsMap: Record<string, boolean> = {};
  if (flagRows) for (const r of flagRows) flagsMap[r.module_key] = r.active;
  const isModuleActive = (moduleKey: string): boolean => flagsMap[moduleKey] !== false;

  const accessMap: Record<string, boolean> = {};
  if (accessRows) {
    for (const row of accessRows) {
      accessMap[row.module_key] = row.has_access;
    }
  }

  const canAccess = (moduleKey: string): boolean => {
    if (isPlatform) return true;
    if (flagsMap[moduleKey] === false) return false; // desativado na plataforma → some
    if (!accessRows) return true; // still loading, don't block
    return accessMap[moduleKey] ?? false;
  };

  return {
    canAccess,
    isModuleActive,
    accessMap,
    isLoading: tierLoading || accessLoading,
    tier,
  };
}
