import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StarkPersonaPreset = "jarvis" | "profissional" | "casual" | "custom";

export interface StarkPrefs {
  persona_preset: StarkPersonaPreset;
  persona_prompt: string | null;
  user_name: string | null;
  bubble_enabled: boolean;
  monthly_token_limit: number | null;
}

const DEFAULT_PREFS: StarkPrefs = {
  persona_preset: "jarvis",
  persona_prompt: null,
  user_name: null,
  bubble_enabled: true,
  monthly_token_limit: null,
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
      .select("persona_preset, persona_prompt, user_name, bubble_enabled, monthly_token_limit")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPrefs({
        persona_preset: (data.persona_preset ?? "jarvis") as StarkPersonaPreset,
        persona_prompt: data.persona_prompt ?? null,
        user_name: data.user_name ?? null,
        bubble_enabled: data.bubble_enabled ?? true,
        monthly_token_limit: data.monthly_token_limit ?? null,
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
