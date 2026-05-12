import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna um token de autenticação válido (access_token do usuário logado).
 * 
 * Lança erro se não houver sessão ativa — NUNCA faz fallback para
 * VITE_SUPABASE_PUBLISHABLE_KEY, pois a anon key não é um token de auth
 * e usá-la como Bearer é uma vulnerabilidade de segurança.
 * 
 * Uso: 
 *   const token = await getAuthToken();
 *   fetch(url, { headers: { Authorization: `Bearer ${token}` } });
 */
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error(
      "Nenhuma sessão ativa encontrada. Faça login novamente."
    );
  }
  
  return session.access_token;
}

/**
 * Versão síncrona que retorna null se não houver sessão.
 * Use apenas quando o token for opcional (ex: chamadas não autenticadas).
 * Para chamadas autenticadas obrigatórias, use getAuthToken().
 */
export function getAuthTokenSync(): string | null {
  // Nota: supabase.auth.getSession() é assíncrono.
  // Esta função é um placeholder para casos onde o token
  // já foi obtido e armazenado em memória.
  return null;
}