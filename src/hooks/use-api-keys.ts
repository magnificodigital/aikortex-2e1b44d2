import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApiKeyEntry {
  provider: string;
  configured: boolean;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<Record<string, ApiKeyEntry>>({});
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("user_api_keys")
      .select("provider")
      .eq("user_id", user.id);

    const map: Record<string, ApiKeyEntry> = {};
    data?.forEach((row: any) => {
      map[row.provider] = { provider: row.provider, configured: true };
    });
    setKeys(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const saveKey = useCallback(async (provider: string, apiKey: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login para salvar chaves."); return false; }

    const { error } = await supabase
      .from("user_api_keys")
      .upsert(
        { user_id: user.id, provider, api_key: apiKey },
        { onConflict: "user_id,provider" }
      );

    if (error) {
      console.error("Error saving key:", error);
      toast.error("Erro ao salvar chave de API.");
      return false;
    }

    setKeys(prev => ({ ...prev, [provider]: { provider, configured: true } }));
    return true;
  }, []);

  const deleteKey = useCallback(async (provider: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      toast.error("Erro ao remover chave.");
      return false;
    }

    setKeys(prev => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });
    return true;
  }, []);

  return { keys, loading, saveKey, deleteKey, refetch: fetchKeys };
}
