import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCredits = () => {
  const { user } = useAuth();

  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ["agency-wallet", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_wallets")
        .select("balance, total_purchased, total_consumed, low_balance_alert")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    balance: wallet?.balance ?? 0,
    totalPurchased: wallet?.total_purchased ?? 0,
    totalConsumed: wallet?.total_consumed ?? 0,
    isLoading,
    isLowBalance: wallet ? wallet.balance < wallet.low_balance_alert : false,
    refetch,
  };
};
