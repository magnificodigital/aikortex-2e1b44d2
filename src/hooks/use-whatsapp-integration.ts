import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppIntegrationStatus = {
  connected: boolean;
  has_access_token: boolean;
  has_phone_number_id: boolean;
  has_business_account_id: boolean;
  has_verify_token: boolean;
  phone_number_id_suffix: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  /** meta_coexistence | meta_embedded | null */
  connection_type: string | null;
};

const WHATSAPP_PROVIDERS = [
  "whatsapp_access_token",
  "whatsapp_phone_number_id",
  "whatsapp_business_account_id",
  "whatsapp_verify_token",
  "whatsapp_display_phone_number",
  "whatsapp_verified_name",
  "whatsapp_connection_type",
] as const;

export function useWhatsAppIntegrationStatus() {
  return useQuery({
    queryKey: ["whatsapp-integration-status"],
    queryFn: async (): Promise<WhatsAppIntegrationStatus> => {
      const { data: { user } } = await supabase.auth.getUser();
      const empty: WhatsAppIntegrationStatus = {
        connected: false,
        has_access_token: false,
        has_phone_number_id: false,
        has_business_account_id: false,
        has_verify_token: false,
        phone_number_id_suffix: null,
        display_phone_number: null,
        verified_name: null,
        connection_type: null,
      };
      if (!user) return empty;

      const { data } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", user.id)
        .in("provider", WHATSAPP_PROVIDERS as unknown as string[]);

      const map = new Map<string, string>();
      (data ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));

      const phoneId = map.get("whatsapp_phone_number_id") ?? "";
      const accessToken = map.get("whatsapp_access_token") ?? "";

      return {
        // "Conectado" = mínimo viável pra enviar (token + phone_number_id)
        connected: accessToken.length > 0 && phoneId.length > 0,
        has_access_token: accessToken.length > 0,
        has_phone_number_id: phoneId.length > 0,
        has_business_account_id: (map.get("whatsapp_business_account_id") ?? "").length > 0,
        has_verify_token: (map.get("whatsapp_verify_token") ?? "").length > 0,
        phone_number_id_suffix: phoneId.length >= 4 ? phoneId.slice(-4) : null,
        display_phone_number: map.get("whatsapp_display_phone_number") || null,
        verified_name: map.get("whatsapp_verified_name") || null,
        connection_type: map.get("whatsapp_connection_type") || null,
      };
    },
  });
}
