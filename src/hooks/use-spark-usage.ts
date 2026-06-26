import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SparkUsageRow {
  llm_provider: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_cents: number;
  created_at: string;
}

export interface SparkUsageSummary {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostCents: number;
  callCount: number;
  byProvider: Record<string, { tokens: number; costCents: number; calls: number }>;
  byModel: Record<string, { tokens: number; costCents: number; calls: number }>;
}

const EMPTY: SparkUsageSummary = {
  totalTokens: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalCostCents: 0,
  callCount: 0,
  byProvider: {},
  byModel: {},
};

export function useSparkUsage(windowDays: number = 30) {
  const [rows, setRows] = useState<SparkUsageRow[]>([]);
  const [summary, setSummary] = useState<SparkUsageSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const since = new Date(Date.now() - windowDays * 86400_000).toISOString();
    const { data } = await (supabase.from("spark_usage" as any) as any)
      .select("llm_provider, llm_model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_cents, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    const list = (data ?? []) as SparkUsageRow[];
    setRows(list);
    setSummary(summarize(list));
    setLoading(false);
  }, [windowDays]);

  useEffect(() => { refetch(); }, [refetch]);

  return { rows, summary, loading, refetch };
}

function summarize(rows: SparkUsageRow[]): SparkUsageSummary {
  const s: SparkUsageSummary = {
    totalTokens: 0, totalPromptTokens: 0, totalCompletionTokens: 0,
    totalCostCents: 0, callCount: rows.length,
    byProvider: {}, byModel: {},
  };
  for (const r of rows) {
    s.totalTokens += r.total_tokens || 0;
    s.totalPromptTokens += r.prompt_tokens || 0;
    s.totalCompletionTokens += r.completion_tokens || 0;
    s.totalCostCents += r.estimated_cost_cents || 0;
    const p = (s.byProvider[r.llm_provider] ??= { tokens: 0, costCents: 0, calls: 0 });
    p.tokens += r.total_tokens || 0;
    p.costCents += r.estimated_cost_cents || 0;
    p.calls += 1;
    const m = (s.byModel[r.llm_model] ??= { tokens: 0, costCents: 0, calls: 0 });
    m.tokens += r.total_tokens || 0;
    m.costCents += r.estimated_cost_cents || 0;
    m.calls += 1;
  }
  return s;
}
