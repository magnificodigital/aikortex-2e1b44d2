// Centralized, fallback-safe Supabase URL helpers.
// VITE_SUPABASE_URL may be undefined in some Lovable preview builds; we
// fall back to the canonical project URL (same fallback used in
// integrations/supabase/client.ts) so request URLs never resolve to
// `undefined/functions/v1/...` (which the browser turns into a relative
// path against the current page → SPA fallback HTML response).

export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://jcahtniqqiaefszhgpqx.supabase.co";

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export function fnUrl(name: string): string {
  return `${SUPABASE_FUNCTIONS_URL}/${name}`;
}
