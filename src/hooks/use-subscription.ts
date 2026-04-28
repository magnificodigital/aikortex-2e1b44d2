import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  trial_days: number;
  features: string[];
  limits: Record<string, number>;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<SubscriptionWithPlan | null> => {
      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select("*, plan:plans(*)")
        .eq("user_id", user!.id)
        .in("status", ["trialing", "active", "past_due", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const sub = data as any;
      return {
        id: sub.id,
        user_id: sub.user_id,
        plan_id: sub.plan_id,
        status: sub.status,
        billing_cycle: sub.billing_cycle,
        trial_ends_at: sub.trial_ends_at,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        canceled_at: sub.canceled_at,
        created_at: sub.created_at,
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          slug: sub.plan.slug,
          description: sub.plan.description,
          price_monthly: Number(sub.plan.price_monthly),
          price_yearly: Number(sub.plan.price_yearly),
          currency: sub.plan.currency,
          is_active: sub.plan.is_active,
          is_featured: sub.plan.is_featured,
          trial_days: sub.plan.trial_days,
          features: sub.plan.features as string[],
          limits: sub.plan.limits as Record<string, number>,
        },
      };
    },
  });

  const subscription = query.data ?? null;
  const plan = subscription?.plan ?? null;

  return {
    subscription,
    plan,
    isLoading: query.isLoading,
    isTrialing: subscription?.status === "trialing",
    isActive: subscription?.status === "active",
    isCanceled: subscription?.status === "canceled",
    isPastDue: subscription?.status === "past_due",
    limits: plan?.limits ?? {},
    refetch: query.refetch,
  };
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from("plans" as any)
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      return (data as any[]).map((p) => ({
        ...p,
        price_monthly: Number(p.price_monthly),
        price_yearly: Number(p.price_yearly),
        features: p.features as string[],
        limits: p.limits as Record<string, number>,
      }));
    },
  });
}
