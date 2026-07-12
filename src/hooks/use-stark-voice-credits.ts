/**
 * useStarkVoiceCredits — saldo de minutos do Stark Voice e historico de sessoes.
 *
 * Fontes:
 * - agency_profiles.monthly_voice_minutes + voice_minutes_used (saldo do tier)
 * - stark_voice_credit_packs (packs pagos avulsos — somam ao saldo)
 * - stark_voice_sessions (historico, ja' tem RLS)
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StarkVoiceCredits {
  tierTotal: number;
  tierUsed: number;
  tierRemaining: number;
  packRemaining: number;
  totalRemaining: number;
}

export interface StarkVoiceSession {
  id: string;
  duration_seconds: number;
  tools_called: string[];
  llm_provider: string | null;
  llm_model: string | null;
  credit_source: string | null;
  created_at: string;
}

const ZERO: StarkVoiceCredits = {
  tierTotal: 0, tierUsed: 0, tierRemaining: 0, packRemaining: 0, totalRemaining: 0,
};

export function useStarkVoiceCredits(historyLimit = 10) {
  const [credits, setCredits] = useState<StarkVoiceCredits>(ZERO);
  const [sessions, setSessions] = useState<StarkVoiceSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Tier minutes direto de agency_profiles (lookup por user_id — mesmo
    // caminho do stark-token; "profiles.agency_id" nao existe).
    const { data: ap } = await (supabase.from("agency_profiles" as any) as any)
      .select("monthly_voice_minutes, voice_minutes_used")
      .eq("user_id", user.id)
      .maybeSingle();
    const tierTotal = ap?.monthly_voice_minutes ?? 0;
    const tierUsed = Number(ap?.voice_minutes_used ?? 0);
    const tierRemaining = Math.max(0, tierTotal - tierUsed);

    // Packs ativos (paid) — saldo = minutes_total - minutes_used
    const { data: packs } = await (supabase.from("stark_voice_credit_packs" as any) as any)
      .select("minutes_total, minutes_used")
      .eq("user_id", user.id)
      .eq("status", "paid");
    const packRemaining = (packs ?? []).reduce(
      (acc: number, p: any) => acc + Math.max(0, (p.minutes_total ?? 0) - Number(p.minutes_used ?? 0)),
      0,
    );

    setCredits({
      tierTotal,
      tierUsed,
      tierRemaining,
      packRemaining,
      totalRemaining: tierRemaining + packRemaining,
    });

    // Historico
    const { data: hist } = await (supabase.from("stark_voice_sessions" as any) as any)
      .select("id, duration_seconds, tools_called, llm_provider, llm_model, credit_source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(historyLimit);
    setSessions((hist as StarkVoiceSession[]) ?? []);

    setLoading(false);
  }, [historyLimit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { credits, sessions, loading, refetch };
}
