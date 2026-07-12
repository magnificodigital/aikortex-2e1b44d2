/**
 * useStarkPlatformTools — kill-switch global de tools do Stark.
 *
 * Guardado em platform_config (key='stark_tools_enabled', value=JSON
 * {tool: bool}). Tool ausente do JSON = liberada. Dois consumidores:
 *  - Admin (/admin?tab=stark): le e ESCREVE (RLS is_platform_user)
 *  - Settings do user: so LE, pra esconder tools mortas pela plataforma
 *    (policy de SELECT p/ authenticated restrita a essa key)
 *
 * Default quando a row nao existe: open_agent_creator bloqueado —
 * mesmo default do Stark Agent (DEFAULT_PLATFORM_TOOLS em agent.py).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CONFIG_KEY = "stark_tools_enabled";

export const DEFAULT_PLATFORM_TOOLS: Record<string, boolean> = {
  open_agent_creator: false,
};

export function useStarkPlatformTools() {
  const [platformTools, setPlatformTools] = useState<Record<string, boolean>>(DEFAULT_PLATFORM_TOOLS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase.from("platform_config" as any) as any)
        .select("value")
        .eq("key", CONFIG_KEY)
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (parsed && typeof parsed === "object") {
          setPlatformTools(parsed);
          setLoading(false);
          return;
        }
      }
      setPlatformTools(DEFAULT_PLATFORM_TOOLS);
    } catch {
      setPlatformTools(DEFAULT_PLATFORM_TOOLS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  /** Admin only — grava o mapa completo. RLS bloqueia nao-platform. */
  const save = useCallback(async (next: Record<string, boolean>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("platform_config" as any) as any)
        .upsert({
          key: CONFIG_KEY,
          value: JSON.stringify(next),
          description: "Kill-switch global das tools do Stark (JSON {tool: bool})",
          is_secret: false,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        }, { onConflict: "key" });
      if (error) { toast.error(`Erro salvando: ${error.message}`); return false; }
      setPlatformTools(next);
      return true;
    } finally {
      setSaving(false);
    }
  }, []);

  /** true = plataforma permite a tool (default quando ausente). */
  const isAllowed = useCallback(
    (toolId: string) => platformTools[toolId] !== false,
    [platformTools],
  );

  return { platformTools, loading, saving, save, isAllowed, refetch };
}
