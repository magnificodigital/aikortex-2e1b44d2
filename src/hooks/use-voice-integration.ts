import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VoiceIntegrationStatus = {
  telnyx_connected: boolean;
  telnyx_public_connected: boolean;
  telnyx_suffix: string | null;
  elevenlabs_connected: boolean;
  elevenlabs_suffix: string | null;
  elevenlabs_agent_id: string | null;
};

const VOICE_PROVIDERS = ["telnyx", "telnyx_public", "elevenlabs", "elevenlabs_agent_id"] as const;

export function useVoiceIntegrationStatus() {
  return useQuery({
    queryKey: ["voice-integration-status"],
    queryFn: async (): Promise<VoiceIntegrationStatus> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          telnyx_connected: false,
          telnyx_public_connected: false,
          telnyx_suffix: null,
          elevenlabs_connected: false,
          elevenlabs_suffix: null,
          elevenlabs_agent_id: null,
        };
      }
      const { data } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", user.id)
        .in("provider", VOICE_PROVIDERS as unknown as string[]);

      const map = new Map<string, string>();
      (data ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));

      const telnyx = map.get("telnyx") ?? "";
      const elevenlabs = map.get("elevenlabs") ?? "";
      const agentId = map.get("elevenlabs_agent_id") ?? "";

      return {
        telnyx_connected: telnyx.length > 0,
        telnyx_public_connected: (map.get("telnyx_public") ?? "").length > 0,
        telnyx_suffix: telnyx.length >= 4 ? telnyx.slice(-4) : null,
        elevenlabs_connected: elevenlabs.length > 0,
        elevenlabs_suffix: elevenlabs.length >= 4 ? elevenlabs.slice(-4) : null,
        elevenlabs_agent_id: agentId.length > 0 ? agentId : null,
      };
    },
  });
}

export function useSaveVoiceKeys() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      telnyx_api_key?: string | null;
      telnyx_public_key?: string | null;
      elevenlabs_api_key?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const updates: { provider: string; api_key: string }[] = [];
      if (payload.telnyx_api_key !== undefined && payload.telnyx_api_key !== null) {
        updates.push({ provider: "telnyx", api_key: payload.telnyx_api_key });
      }
      if (payload.telnyx_public_key !== undefined && payload.telnyx_public_key !== null) {
        updates.push({ provider: "telnyx_public", api_key: payload.telnyx_public_key });
      }
      if (payload.elevenlabs_api_key !== undefined && payload.elevenlabs_api_key !== null) {
        updates.push({ provider: "elevenlabs", api_key: payload.elevenlabs_api_key });
      }

      for (const u of updates) {
        if (u.api_key) {
          const { error } = await supabase
            .from("user_api_keys")
            .upsert({ user_id: user.id, ...u }, { onConflict: "user_id,provider" });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-integration-status"] });
      toast.success("Integração de voz salva");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useDisconnectVoiceProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: "telnyx" | "elevenlabs") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const providers = provider === "telnyx" ? ["telnyx", "telnyx_public"] : ["elevenlabs"];
      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", user.id)
        .in("provider", providers);
      if (error) throw error;
    },
    onSuccess: (_d, provider) => {
      qc.invalidateQueries({ queryKey: ["voice-integration-status"] });
      toast.success(`${provider === "telnyx" ? "Telnyx" : "ElevenLabs"} desconectado`);
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}
