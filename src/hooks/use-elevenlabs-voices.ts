import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string | null;
  category: string;
  labels: Record<string, string>;
}

export function useElevenLabsVoices() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUserKey, setHasUserKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // 1. Try user's own key
    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "elevenlabs")
      .single();

    let apiKey = keyData?.api_key ?? null;
    const isUserKey = !!apiKey;
    setHasUserKey(isUserKey);

    // 2. Fallback to platform key
    if (!apiKey) {
      const { data: platformKey } = await supabase
        .from("platform_config")
        .select("value")
        .eq("key", "elevenlabs_api_key")
        .single();
      apiKey = platformKey?.value ?? null;
    }

    if (!apiKey) {
      setError("Nenhuma chave ElevenLabs disponível");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
      });

      if (!res.ok) {
        setError("Erro ao buscar vozes da ElevenLabs");
        setLoading(false);
        return;
      }

      const data = await res.json();
      let mapped: ElevenLabsVoice[] = (data.voices || []).map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        preview_url: v.preview_url || null,
        category: v.category || "premade",
        labels: v.labels || {},
      }));

      // Limit platform voices to 6
      if (!isUserKey) {
        mapped = mapped.slice(0, 6);
      }

      setVoices(mapped);
      if (mapped.length === 0) setError("Nenhuma voz encontrada");
    } catch {
      setError("Erro ao conectar com a ElevenLabs");
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  return { voices, loading, hasUserKey, error, refetch: fetchVoices };
}
