import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ColumnType = "text" | "number" | "boolean";

export type ClientTableColumn = {
  key: string;
  label: string;
  type: ColumnType;
};

export type ClientTable = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  columns: ClientTableColumn[];
  enabled: boolean;
  rows_count?: number;
  created_at: string;
  updated_at: string;
};

export function useClientTables(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["client-tables", clientId],
    queryFn: async (): Promise<ClientTable[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_tables")
        .select("*, rows_count:client_table_rows(count)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        columns: Array.isArray(t.columns) ? t.columns : [],
        rows_count: Array.isArray(t.rows_count) ? t.rows_count[0]?.count ?? 0 : 0,
      })) as ClientTable[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      client_id: string;
      name: string;
      description?: string | null;
      columns: ClientTableColumn[];
    }) => {
      const { data, error } = await supabase
        .from("client_tables")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["client-tables", vars.client_id] });
      toast.success("Tabela criada");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useUpdateClientTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      client_id: _client_id,
      ...patch
    }: { id: string; client_id: string; name?: string; description?: string | null; enabled?: boolean }) => {
      const { data, error } = await supabase
        .from("client_tables")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["client-tables", vars.client_id] });
      toast.success("Tabela atualizada");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useDeleteClientTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from("client_tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["client-tables", vars.client_id] });
      toast.success("Tabela removida");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
