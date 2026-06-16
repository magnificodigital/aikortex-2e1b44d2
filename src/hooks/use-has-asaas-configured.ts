import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current agency has an Asaas API key configured.
 * Reads via a security-definer RPC that returns only a boolean — the raw
 * API key is never exposed to the browser (XSS hardening).
 */
export function useHasAsaasConfigured() {
  const query = useQuery({
    queryKey: ["has-asaas-configured"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await (supabase as any).rpc("has_asaas_configured");
      if (error) return false;
      return Boolean(data);
    },
    staleTime: 60_000,
  });

  return { hasAsaasConfigured: query.data ?? false, isLoading: query.isLoading };
}
