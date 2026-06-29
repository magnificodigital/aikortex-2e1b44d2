import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StarkPersonaPreset = "executivo" | "profissional" | "casual" | "custom";
export type StarkLanguage = "pt-BR" | "en" | "es";

export interface StarkPrefs {
  persona_preset: StarkPersonaPreset;
  persona_prompt: string | null;
  user_name: string | null;
  bubble_enabled: boolean;
  monthly_token_limit: number | null;
  tone: number;               // 0..100 (formal..casual)
  response_length: number;    // 0..100 (curto..detalhado)
  energy: number;             // 0..100 (serio..animado)
  language: StarkLanguage;
  tools_enabled: Record<string, boolean> | null;  // null = todas ativas
}

const DEFAULT_PREFS: StarkPrefs = {
  persona_preset: "executivo",
  persona_prompt: null,
  user_name: null,
  bubble_enabled: true,
  monthly_token_limit: null,
  tone: 50,
  response_length: 25,
  energy: 50,
  language: "pt-BR",
  tools_enabled: null,
};

export function useStarkPrefs() {
  const [prefs, setPrefs] = useState<StarkPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase.from("stark_user_prefs" as any) as any)
      .select("persona_preset, persona_prompt, user_name, bubble_enabled, monthly_token_limit, tone, response_length, energy, language, tools_enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      // jarvis legado vira executivo no front (migration ja' fez no banco mas roda 2x sem dano).
      const preset = (data.persona_preset === "jarvis" ? "executivo" : data.persona_preset) as StarkPersonaPreset;
      setPrefs({
        persona_preset: preset ?? "executivo",
        persona_prompt: data.persona_prompt ?? null,
        user_name: data.user_name ?? null,
        bubble_enabled: data.bubble_enabled ?? true,
        monthly_token_limit: data.monthly_token_limit ?? null,
        tone: data.tone ?? 50,
        response_length: data.response_length ?? 25,
        energy: data.energy ?? 50,
        language: (data.language ?? "pt-BR") as StarkLanguage,
        tools_enabled: data.tools_enabled ?? null,
      });
    } else {
      setPrefs(DEFAULT_PREFS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const save = useCallback(async (patch: Partial<StarkPrefs>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado"); return false; }
      const next = { ...prefs, ...patch };
      const { error } = await (supabase.from("stark_user_prefs" as any) as any)
        .upsert({
          user_id: user.id,
          ...next,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) { toast.error(`Erro: ${error.message}`); return false; }
      setPrefs(next);
      return true;
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  return { prefs, loading, saving, save, refetch };
}
