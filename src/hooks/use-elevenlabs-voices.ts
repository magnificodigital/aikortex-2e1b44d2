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

    // Detecta se user tem chave (afeta UI: mostra "configurar chave" se não)
    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("provider")
      .eq("user_id", user.id)
      .eq("provider", "elevenlabs")
      .maybeSingle();
    setHasUserKey(!!keyData);

    if (!keyData) {
      setError("Configure sua chave ElevenLabs em Canais → Voz");
      setLoading(false);
      return;
    }

    // Usa voice-resources edge function — chave fica no servidor, nunca no client.
    // Antes esse hook lia api_key do DB e fazia fetch direto pra api.elevenlabs.io,
    // expondo a chave em devtools.
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("voice-resources", {
        body: { provider: "elevenlabs", action: "voices" },
      });
      if (invokeErr) throw invokeErr;
      const d = data as { ok: boolean; voices?: Array<{ voice_id: string; name: string; preview_url?: string | null; category?: string; language?: string; gender?: string }> ; message?: string };
      if (!d?.ok) {
        setError(d?.message ?? "Erro ao buscar vozes");
        setLoading(false);
        return;
      }
      const mapped: ElevenLabsVoice[] = (d.voices ?? []).map((v) => ({
        voice_id: v.voice_id,
        name: v.name,
        preview_url: v.preview_url ?? null,
        category: v.category ?? "premade",
        labels: { language: v.language ?? "", gender: v.gender ?? "" },
      }));
      setVoices(mapped);
      if (mapped.length === 0) setError("Nenhuma voz encontrada");
    } catch (e) {
      setError(`Erro: ${(e as Error).message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  return { voices, loading, hasUserKey, error, refetch: fetchVoices };
}
