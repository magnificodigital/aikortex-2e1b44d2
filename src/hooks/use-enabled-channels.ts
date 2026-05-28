import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChannelKey =
  | "email"
  | "whatsapp"
  | "voice"
  | "sms"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "telegram";

const DEFAULT_ENABLED: ChannelKey[] = ["email", "whatsapp"];

/**
 * Lista de canais ativados no nível da agência. Define quais canais
 * aparecem no menu lateral do agente em "Canais".
 */
export function useEnabledChannels() {
  return useQuery({
    queryKey: ["enabled-channels"],
    queryFn: async (): Promise<ChannelKey[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_ENABLED;
      const { data } = await (supabase as any)
        .from("agency_profiles")
        .select("enabled_channels")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.enabled_channels as ChannelKey[]) ?? DEFAULT_ENABLED;
    },
    staleTime: 30_000,
  });
}

export function useToggleChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channel, enabled }: { channel: ChannelKey; enabled: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Pega lista atual
      const { data: row } = await (supabase as any)
        .from("agency_profiles")
        .select("enabled_channels")
        .eq("user_id", user.id)
        .maybeSingle();
      const current = (row?.enabled_channels as string[]) ?? DEFAULT_ENABLED;

      const next = enabled
        ? Array.from(new Set([...current, channel]))
        : current.filter((c) => c !== channel);

      const { error } = await (supabase as any)
        .from("agency_profiles")
        .update({ enabled_channels: next })
        .eq("user_id", user.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["enabled-channels"] });
      toast.success(`Canal ${vars.channel} ${vars.enabled ? "ativado" : "desativado"}`);
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}
