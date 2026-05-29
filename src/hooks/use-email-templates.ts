import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EmailTemplate = {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
};

export type EmailTemplateInput = {
  name: string;
  subject: string;
  body_html: string;
};

/**
 * Extrai os nomes únicos de placeholders {chave} encontrados num texto.
 * Mesma sintaxe usada nos campos subject_template/message_template das cadências.
 */
export function extractTemplateVariables(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{([a-z_][a-z0-9_]*)\}/gi) ?? [];
  const names = matches.map((m) => m.slice(1, -1));
  return Array.from(new Set(names));
}

/**
 * Substitui placeholders {chave} num texto usando um mapa de exemplo.
 * Usado pelo preview do editor pra mostrar como o email vai chegar.
 */
export function renderTemplatePreview(text: string, values: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (_, key) => {
    return values[key] ?? `{${key}}`;
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
    staleTime: 60_000,
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmailTemplateInput): Promise<EmailTemplate> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("email_templates")
        .insert({ user_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template criado");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & EmailTemplateInput): Promise<EmailTemplate> => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template atualizado");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template removido");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}
