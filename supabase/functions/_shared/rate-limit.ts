import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_PER_MINUTE = 60;

/**
 * Verifica e incrementa o contador de rate limit para a agência.
 * Retorna true = permitido, false = bloqueado.
 * Fail-open: em caso de erro no check, permite a requisição.
 */
export async function checkRateLimit(agencyId: string): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / 60_000) * 60_000
    ).toISOString();

    const { data, error } = await supabase.rpc(
      "check_and_increment_rate_limit",
      {
        p_agency_id: agencyId,
        p_window_start: windowStart,
        p_limit: RATE_LIMIT_PER_MINUTE,
      }
    );

    if (error) {
      console.error("checkRateLimit error:", error.message);
      return true; // fail-open
    }

    return data === true;
  } catch (e) {
    console.error("checkRateLimit exception:", e);
    return true; // fail-open
  }
}
