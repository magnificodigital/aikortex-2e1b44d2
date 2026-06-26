// Helper compartilhado: checa se um provedor de plataforma (ElevenLabs,
// Asaas, OpenAI, etc) está ativo em /admin?tab=api-keys.
//
// Estado salvo em platform_config com key '{providerId}_active':
//   'true' (ou ausente)  → ativo (default)
//   'false'              → inativo (admin desligou via UI)
//
// Edge functions chamam isso antes de consumir a chave do provedor.
// Se inativo, a function deve retornar erro estruturado e NÃO tentar
// usar o serviço.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/** Retorna true se o provedor está ativo (default) ou false se admin desligou. */
export async function isProviderActive(
  admin: SupabaseClient,
  providerId: string,
): Promise<boolean> {
  try {
    const { data } = await admin
      .from("platform_config")
      .select("value")
      .eq("key", `${providerId}_active`)
      .maybeSingle();
    const value = (data as { value?: string } | null)?.value;
    return value !== "false"; // ausente = ativo (default)
  } catch {
    // Erro de query — assume ativo pra nao derrubar feature por bug aqui
    return true;
  }
}

/** Mensagem padrão pro toast quando inativo. */
export function providerInactiveMessage(providerLabel: string): string {
  return `Provedor ${providerLabel} está desativado. Admin pode reativar em /admin?tab=api-keys.`;
}
