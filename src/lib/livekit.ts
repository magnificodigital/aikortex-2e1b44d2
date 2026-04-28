import { supabase } from "@/integrations/supabase/client";

const TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`;

export async function getLiveKitToken(roomName: string, identity: string, name: string, isHost: boolean) {
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ roomName, identity, name, isHost }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `Erro ${resp.status}`);
  }

  return resp.json() as Promise<{ token: string; url: string }>;
}
