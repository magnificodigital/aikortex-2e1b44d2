import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CrmContact {
  id: string;
  agency_id: string;
  client_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  stage_slug: string;
  temperature: "hot" | "warm" | "cold" | null;
  budget: string | null;
  authority: string | null;
  need: string | null;
  timeline: string | null;
  notes: string | null;
  primary_agent_id: string | null;
  source_channel: string | null;
  client_table_row_id: string | null;
  external_ids: Record<string, string>;
  custom_fields: Record<string, unknown>;
  last_interaction_at: string | null;
  next_action_at: string | null;
  next_action_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmInteraction {
  id: string;
  contact_id: string;
  agency_id: string;
  agent_id: string | null;
  type: string;
  channel: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CrmStage {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  order_index: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// Stages
// ──────────────────────────────────────────────────────────────────────────

export function useCrmStages() {
  return useQuery({
    queryKey: ["crm-stages"],
    queryFn: async (): Promise<CrmStage[]> => {
      const { data, error } = await (supabase
        .from("crm_pipeline_stages" as any)
        .select("*")
        .order("order_index", { ascending: true }) as any);
      if (error) throw error;
      // Se não há stages ainda, dispara seed via RPC
      if (!data || data.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: agency } = await (supabase
            .from("agency_profiles" as any)
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle() as any);
          if ((agency as { id?: string } | null)?.id) {
            await (supabase.rpc("seed_default_crm_stages" as any, { p_agency_id: (agency as { id: string }).id }) as any);
            const { data: refetch } = await (supabase
              .from("crm_pipeline_stages" as any)
              .select("*")
              .order("order_index", { ascending: true }) as any);
            return (refetch as CrmStage[]) || [];
          }
        }
      }
      return (data as CrmStage[]) || [];
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Contacts
// ──────────────────────────────────────────────────────────────────────────

export function useCrmContacts(opts?: { stageSlug?: string; agentId?: string }) {
  return useQuery({
    queryKey: ["crm-contacts", opts?.stageSlug ?? "all", opts?.agentId ?? "all"],
    queryFn: async (): Promise<CrmContact[]> => {
      let query = (supabase.from("crm_contacts" as any).select("*") as any).order("updated_at", { ascending: false }).limit(500);
      if (opts?.stageSlug) query = query.eq("stage_slug", opts.stageSlug);
      if (opts?.agentId) query = query.eq("primary_agent_id", opts.agentId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as CrmContact[]) || [];
    },
  });
}

export function useCrmContact(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ["crm-contact", contactId],
    queryFn: async (): Promise<CrmContact | null> => {
      if (!contactId) return null;
      const { data, error } = await (supabase
        .from("crm_contacts" as any)
        .select("*")
        .eq("id", contactId)
        .maybeSingle() as any);
      if (error) throw error;
      return (data as CrmContact) || null;
    },
    enabled: !!contactId,
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<CrmContact> }) => {
      const { error } = await (supabase
        .from("crm_contacts" as any)
        .update(vars.patch)
        .eq("id", vars.id) as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      qc.invalidateQueries({ queryKey: ["crm-contact", vars.id] });
      toast.success("Atualizado");
    },
    onError: (err) => toast.error(`Falha: ${(err as Error).message}`),
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Interactions
// ──────────────────────────────────────────────────────────────────────────

export function useCrmInteractions(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ["crm-interactions", contactId],
    queryFn: async (): Promise<CrmInteraction[]> => {
      if (!contactId) return [];
      const { data, error } = await (supabase
        .from("crm_interactions" as any)
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(200) as any);
      if (error) throw error;
      return (data as CrmInteraction[]) || [];
    },
    enabled: !!contactId,
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { contactId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const { data: agency } = await (supabase
        .from("agency_profiles" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle() as any);
      if (!(agency as { id?: string } | null)?.id) throw new Error("Agência não encontrada");
      const { error } = await (supabase.from("crm_interactions" as any).insert({
        contact_id: vars.contactId,
        agency_id: (agency as { id: string }).id,
        type: "note",
        content: vars.content,
      }) as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-interactions", vars.contactId] });
      toast.success("Nota adicionada");
    },
    onError: (err) => toast.error(`Falha: ${(err as Error).message}`),
  });
}
