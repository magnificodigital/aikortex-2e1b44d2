import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fnUrl } from "@/lib/supabase-url";

export type WhatsAppTemplateStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL"
  | "PENDING_DELETION";

export type WhatsAppTemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS" | string;
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
  text?: string;
  buttons?: any[];
  example?: { header_text?: string[]; body_text?: string[][] };
};

export type WhatsAppTemplate = {
  name: string;
  status: WhatsAppTemplateStatus;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | string;
  components: WhatsAppTemplateComponent[];
  quality_score?: { score?: string };
  rejected_reason?: string;
};

export type WhatsAppTemplatesIntegrationError = {
  code: "META_TOKEN_EXPIRED" | string;
  message: string;
  details?: unknown;
};

export type WhatsAppTemplatesResponse = {
  templates: WhatsAppTemplate[];
  integration_error?: WhatsAppTemplatesIntegrationError;
};

/**
 * Conta quantos placeholders {{N}} aparecem no body do template.
 * Usado pelo CadenceEditorDialog pra pré-popular o número de variáveis
 * que a agência precisa preencher.
 */
export function countTemplateVariables(template: WhatsAppTemplate | null | undefined): number {
  if (!template) return 0;
  const body = template.components.find((c) => c.type === "BODY")?.text ?? "";
  const matches = body.match(/\{\{\d+\}\}/g) ?? [];
  return new Set(matches).size;
}

export function templateBodyPreview(template: WhatsAppTemplate | null | undefined): string {
  if (!template) return "";
  return template.components.find((c) => c.type === "BODY")?.text ?? "";
}

async function callTemplatesFn<T = any>(
  action: "list" | "create" | "delete",
  body?: Record<string, unknown>,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");
  const url = `${fnUrl("whatsapp-templates")}?action=${action}`;
  const resp = await fetch(url, {
    method: action === "list" ? "GET" : action === "delete" ? "DELETE" : "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json();
  if (!resp.ok) {
    const msg = json?.integration_error?.message || json?.error || `whatsapp-templates ${action} failed (${resp.status})`;
    throw new Error(msg);
  }
  return json as T;
}

async function listWhatsAppTemplates(): Promise<WhatsAppTemplatesResponse> {
  try {
    const res = await callTemplatesFn<WhatsAppTemplatesResponse>("list");
    return { templates: res.templates ?? [], integration_error: res.integration_error };
  } catch (e) {
    // Se WhatsApp não está configurado, retorna vazio (não erro) — UI mostra estado
    const msg = (e as Error).message;
    if (msg.includes("MISSING_WABA_CONFIG")) return { templates: [] };
    throw e;
  }
}

export function useWhatsAppTemplatesResponse() {
  return useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: listWhatsAppTemplates,
    staleTime: 60_000,
  });
}

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: listWhatsAppTemplates,
    select: (res): WhatsAppTemplate[] => res.templates,
    staleTime: 60_000,
  });
}

export function useDeleteWhatsAppTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return callTemplatesFn("delete", { name });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template removido");
    },
    onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
  });
}
