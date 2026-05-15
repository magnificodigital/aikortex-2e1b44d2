import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current agency has an Asaas API key configured.
 * Used to show "no billing" mode UX in flows that optionally use Asaas.
 */
export function useHasAsaasConfigured() {
  const query = useQuery({
    queryKey: ["has-asaas-configured"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("agency_secrets")
        .select("asaas_api_key")
        .eq("agency_user_id", user.id)
        .maybeSingle();
      return Boolean(data?.asaas_api_key);
    },
    staleTime: 60_000,
  });

  return { hasAsaasConfigured: query.data ?? false, isLoading: query.isLoading };
}
