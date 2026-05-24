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

export type AgencyClientTable = ClientTable & {
  client_name: string;
};

/**
 * Lista TODAS as tabelas de TODOS os clientes da agência logada.
 * Usado pelo seletor de auto-trigger de cadência, que precisa cruzar clientes.
 * Cada item vem com `client_name` pra desambiguar na UI.
 */
export function useAllAgencyClientTables() {
  return useQuery({
    queryKey: ["all-agency-client-tables"],
    queryFn: async (): Promise<AgencyClientTable[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // 1) acha agency_id pelo user logado
      const { data: agencyRow } = await supabase
        .from("agency_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!agencyRow?.id) return [];

      // 2) lista todas as tabelas dos clientes dessa agência
      const { data, error } = await supabase
        .from("client_tables")
        .select("*, client:agency_clients!inner(id, client_name, agency_id)")
        .eq("enabled", true)
        .eq("client.agency_id", agencyRow.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((t: any) => ({
        ...t,
        columns: Array.isArray(t.columns) ? t.columns : [],
        client_name: t.client?.client_name ?? "(sem nome)",
      })) as AgencyClientTable[];
    },
  });
}

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

export type ClientTableRow = {
  id: string;
  table_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export function useClientTableRows(
  tableId: string | null | undefined,
  opts?: { page?: number; pageSize?: number }
) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;
  return useQuery({
    queryKey: ["client-table-rows", tableId, { page, pageSize }],
    queryFn: async (): Promise<{ rows: ClientTableRow[]; total: number }> => {
      if (!tableId) return { rows: [], total: 0 };
      const offset = (page - 1) * pageSize;
      const { data, error, count } = await supabase
        .from("client_table_rows")
        .select("*", { count: "exact" })
        .eq("table_id", tableId)
        .order("created_at", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as ClientTableRow[], total: count ?? 0 };
    },
    enabled: !!tableId,
  });
}

export function useCreateRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ table_id, data }: { table_id: string; data: Record<string, any> }) => {
      const { data: row, error } = await supabase
        .from("client_table_rows")
        .insert({ table_id, data })
        .select()
        .single();
      if (error) throw error;
      return row;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-table-rows", vars.table_id] });
      qc.invalidateQueries({ queryKey: ["client-tables"] });
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useUpdateRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; table_id: string; data: Record<string, any> }) => {
      const { data: row, error } = await supabase
        .from("client_table_rows")
        .update({ data })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return row;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-table-rows", vars.table_id] });
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useDeleteRows() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[]; table_id: string }) => {
      const { error } = await supabase.from("client_table_rows").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-table-rows", vars.table_id] });
      qc.invalidateQueries({ queryKey: ["client-tables"] });
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useBulkInsertRows() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ table_id, rows }: { table_id: string; rows: Record<string, any>[] }) => {
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map((data) => ({ table_id, data }));
        const { error } = await supabase.from("client_table_rows").insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }
      return { inserted };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-table-rows", vars.table_id] });
      qc.invalidateQueries({ queryKey: ["client-tables"] });
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
