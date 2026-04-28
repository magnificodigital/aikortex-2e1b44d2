import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BYOK_PROVIDERS = ["openai", "anthropic", "gemini", "openrouter"];

export const useMonthlyUsage = () => {
  const { user } = useAuth();
  const yearMonth = new Date().toISOString().slice(0, 7);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["monthly-usage", user?.id, yearMonth],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      // Fetch usage, subscription + plan, and BYOK keys in parallel
      const [usageRes, subRes, keysRes] = await Promise.all([
        supabase
          .from("monthly_usage")
          .select("message_count")
          .eq("user_id", user!.id)
          .eq("year_month", yearMonth)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("plan_id, plans(slug)")
          .eq("user_id", user!.id)
          .in("status", ["active", "trialing"])
          .maybeSingle(),
        supabase
          .from("user_api_keys")
          .select("provider")
          .eq("user_id", user!.id)
          .in("provider", BYOK_PROVIDERS),
      ]);

      const messageCount = usageRes.data?.message_count ?? 0;
      const planSlug = (subRes.data?.plans as any)?.slug || "starter";

      // Fetch limit for the plan
      const { data: limitData } = await supabase
        .from("plan_message_limits")
        .select("monthly_limit")
        .eq("plan_slug", planSlug)
        .maybeSingle();

      const monthlyLimit = limitData?.monthly_limit ?? 500;
      const hasByok = (keysRes.data?.length ?? 0) > 0;

      return { messageCount, monthlyLimit, planSlug, hasByok };
    },
  });

  const messageCount = data?.messageCount ?? 0;
  const monthlyLimit = data?.monthlyLimit ?? 500;
  const isUnlimited = monthlyLimit === -1;
  const hasByok = data?.hasByok ?? false;
  const planSlug = data?.planSlug ?? "starter";

  return {
    messageCount,
    monthlyLimit,
    planSlug,
    hasByok,
    isNearLimit: !isUnlimited && !hasByok && messageCount >= monthlyLimit * 0.9,
    isAtLimit: !isUnlimited && !hasByok && messageCount >= monthlyLimit,
    isUnlimited,
    isLoading,
    refetch,
  };
};
