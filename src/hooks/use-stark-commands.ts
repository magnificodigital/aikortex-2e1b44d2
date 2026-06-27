import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StarkCommand {
  id: string;
  label: string;
  prompt: string;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
}

export function useStarkCommands() {
  const [commands, setCommands] = useState<StarkCommand[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase.from("stark_commands" as any) as any)
      .select("id, label, prompt, icon, sort_order, enabled")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setCommands((data ?? []) as StarkCommand[]);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const create = useCallback(async (cmd: Omit<StarkCommand, "id">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Não autenticado"); return null; }
    const { data, error } = await (supabase.from("stark_commands" as any) as any)
      .insert({ user_id: user.id, ...cmd })
      .select()
      .single();
    if (error) { toast.error(`Erro: ${error.message}`); return null; }
    setCommands(prev => [...prev, data as StarkCommand]);
    return data as StarkCommand;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<StarkCommand>) => {
    const { error } = await (supabase.from("stark_commands" as any) as any)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(`Erro: ${error.message}`); return false; }
    setCommands(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    return true;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase.from("stark_commands" as any) as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error(`Erro: ${error.message}`); return false; }
    setCommands(prev => prev.filter(c => c.id !== id));
    return true;
  }, []);

  return { commands, loading, create, update, remove, refetch };
}
