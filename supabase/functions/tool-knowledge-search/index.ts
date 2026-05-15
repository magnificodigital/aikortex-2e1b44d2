// Sprint 2.5-e — Tool: knowledge_search (RAG sobre KBs do agente)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_BASE = "https://api.openai.com/v1";

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { return jsonError(400, "Invalid JSON"); }

  const { agent_id, query, top_k = 5, min_similarity = 0.3 } = body || {};
  if (!agent_id || typeof query !== "string" || !query.trim()) {
    return jsonError(400, "Missing agent_id or query");
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return jsonError(500, "OPENAI_API_KEY not configured");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Embed query
  let embedding: number[] | null = null;
  try {
    const embResp = await fetch(`${OPENAI_BASE}/embeddings`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
    });
    if (!embResp.ok) {
      const t = await embResp.text().catch(() => "");
      return jsonError(500, `Embedding failed: HTTP ${embResp.status} ${t.slice(0, 200)}`);
    }
    const ed = await embResp.json();
    embedding = ed?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) return jsonError(500, "Invalid embedding response");
  } catch (e) {
    return jsonError(500, `Embedding error: ${(e as Error).message}`);
  }

  // 2. Match via RPC
  const safeTopK = Math.min(Math.max(Number(top_k) || 5, 1), 10);
  const { data: matches, error: matchErr } = await admin.rpc("match_kb_chunks", {
    p_agent_id: agent_id,
    p_query_embedding: embedding,
    p_match_count: safeTopK,
    p_min_similarity: Number(min_similarity) || 0,
  });
  if (matchErr) return jsonError(500, `Match failed: ${matchErr.message}`);

  const matchList = (matches as any[]) ?? [];

  // 3. Enriquece com título/source_type via kb_documents
  const docIds = Array.from(new Set(matchList.map((m) => m.document_id).filter(Boolean)));
  let docMap: Record<string, { title: string | null; source_type: string | null }> = {};
  if (docIds.length > 0) {
    const { data: docs } = await admin
      .from("kb_documents")
      .select("id, title, source_type")
      .in("id", docIds);
    for (const d of (docs as any[]) ?? []) {
      docMap[d.id] = { title: d.title, source_type: d.source_type };
    }
  }

  const results = matchList.map((m: any) => ({
    similarity: m.similarity,
    source: docMap[m.document_id]?.title ?? "(sem título)",
    source_type: docMap[m.document_id]?.source_type ?? "unknown",
    content: m.content,
  }));

  const formatted = results.length > 0
    ? results
        .map((r, i) => `[${i + 1}] Fonte: ${r.source} (${r.source_type})\n${r.content}\n`)
        .join("\n---\n")
    : "Nenhuma informação relevante encontrada na base de conhecimento para esta consulta.";

  return new Response(
    JSON.stringify({ results, formatted, total_matches: results.length, query }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
