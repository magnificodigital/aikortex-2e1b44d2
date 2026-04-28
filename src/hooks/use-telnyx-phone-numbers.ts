import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TelnyxPhoneNumber {
  id: string;
  phone_number: string;
  status: string;
  country_code: string;
  features: { voice: boolean; sms: boolean };
}

export interface AvailableNumber {
  phone_number: string;
  monthly_cost: string;
  features: string[];
  region_information: { region_name: string; region_type: string }[];
}

export function useTelnyxPhoneNumbers() {
  const [numbers, setNumbers] = useState<TelnyxPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [noKeyConfigured, setNoKeyConfigured] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const fetchNumbers = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "telnyx")
      .single();

    if (!keyData) {
      setNoKeyConfigured(true);
      setLoading(false);
      return;
    }

    setNoKeyConfigured(false);
    setApiKey(keyData.api_key);

    try {
      const res = await fetch("https://api.telnyx.com/v2/phone_numbers?page[size]=50", {
        headers: { Authorization: `Bearer ${keyData.api_key}` },
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      const mapped: TelnyxPhoneNumber[] = (data.data || []).map((n: any) => ({
        id: n.id,
        phone_number: n.phone_number,
        status: n.status || "active",
        country_code: n.address_requirements?.country_code || n.phone_number?.slice(1, 3) || "",
        features: {
          voice: n.features?.some((f: any) => f.name === "voice") ?? true,
          sms: n.features?.some((f: any) => f.name === "sms") ?? false,
        },
      }));

      setNumbers(mapped);
    } catch {
      // silent
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchNumbers(); }, [fetchNumbers]);

  const searchAvailable = useCallback(async (
    countryCode: string,
    numberType: string,
    areaCode?: string,
  ): Promise<AvailableNumber[]> => {
    if (!apiKey) return [];

    const params = new URLSearchParams({
      "filter[country_code]": countryCode,
      "filter[phone_number_type]": numberType,
      "filter[limit]": "10",
    });
    if (areaCode) params.set("filter[national_destination_code]", areaCode);

    try {
      const res = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((n: any) => ({
        phone_number: n.phone_number,
        monthly_cost: n.cost_information?.monthly_cost || n.monthly_cost || "—",
        features: n.features?.map((f: any) => f.name) || [],
        region_information: n.region_information || [],
      }));
    } catch {
      return [];
    }
  }, [apiKey]);

  const buyNumber = useCallback(async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    if (!apiKey) return { success: false, error: "Chave Telnyx não configurada" };

    try {
      const res = await fetch("https://api.telnyx.com/v2/number_orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_numbers: [{ phone_number: phoneNumber }] }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.errors?.[0]?.detail || "Erro ao comprar número" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão" };
    }
  }, [apiKey]);

  const configureWebhook = useCallback(async (numberId: string): Promise<boolean> => {
    if (!apiKey) return false;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return false;

    try {
      const res = await fetch(`https://api.telnyx.com/v2/phone_numbers/${numberId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connection_id: null,
          webhook_url: `${supabaseUrl}/functions/v1/telnyx-webhook`,
          webhook_failover_url: null,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [apiKey]);

  return {
    numbers,
    loading,
    noKeyConfigured,
    apiKey,
    searchAvailable,
    buyNumber,
    configureWebhook,
    refetch: fetchNumbers,
  };
}
