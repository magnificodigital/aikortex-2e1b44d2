import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthContext, corsHeaders } from "../_shared/auth.ts";

type FaqItem = { question: string; answer: string };
type IngestPayload =
  | { kb_id: string; source_type: "text"; title: string; raw_content: string }
  | { kb_id: string; source_type: "faq"; title: string; faqs: FaqItem[] };

const OPENAI_BASE = "https://api.openai.com/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await getAuthContext(req);
  if (auth instanceof Response) return auth;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  let body: IngestPayload;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }

  const { kb_id, source_type, title } = body as any;
  if (!kb_id || !source_type || !title) return jsonError(400, "Missing required fields");
  if (source_type !== "text" && source_type !== "faq") {
    return jsonError(400, `Unsupported source_type: ${source_type}`);
  }

  // 1. Validate ownership: KB belongs to an agent owned by the authenticated user
  const { data: kb, error: kbErr } = await adminClient
    .from("agent_knowledge_bases")
    .select(`
      id, agent_id, chunk_size, chunk_overlap, embedding_model, embedding_dim,
      user_agents!inner ( user_id )
    `)
    .eq("id", kb_id)
    .single();

  if (kbErr || !kb) return jsonError(404, "Knowledge base not found");
  if ((kb.user_agents as any).user_id !== auth.user.id) {
    return jsonError(403, "No permission to ingest in this KB");
  }

  // 2. Create document with status 'processing'
  const rawContent = source_type === "text" ? (body as any).raw_content ?? "" : null;
  const docMetadata =
    source_type === "faq"
      ? { faqs_count: (body as any).faqs?.length ?? 0 }
      : { raw_chars: rawContent?.length ?? 0 };

  const { data: doc, error: docErr } = await adminClient
    .from("kb_documents")
    .insert({
      knowledge_base_id: kb_id,
      source_type,
      title,
      raw_content: rawContent,
      status: "processing",
      metadata: docMetadata,
    })
    .select()
    .single();

  if (docErr || !doc) return jsonError(500, `Failed to create document: ${docErr?.message}`);

  const startedAt = Date.now();

  try {
    // 3a. Build chunks
    const chunks: string[] =
      source_type === "text"
        ? chunkText(rawContent ?? "", kb.chunk_size, kb.chunk_overlap)
        : (body as any).faqs.map((f: FaqItem) => `P: ${f.question}\nR: ${f.answer}`);

    if (chunks.length === 0) throw new Error("No chunks produced (empty content?)");
    if (chunks.length > 500) throw new Error(`Too many chunks (${chunks.length}). Max 500 per document.`);

    // 3b. Generate embeddings via OpenAI
    const modelId = kb.embedding_model.replace(/^openai\//, "");
    const embeddings = await generateEmbeddings(chunks, modelId);

    if (embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`);
    }
    if (embeddings[0].length !== kb.embedding_dim) {
      throw new Error(`Embedding dim mismatch: got ${embeddings[0].length}, expected ${kb.embedding_dim}`);
    }

    // 3c. Insert chunks. pgvector accepts string format "[v1,v2,...]".
    const rows = chunks.map((content, idx) => ({
      document_id: doc.id,
      knowledge_base_id: kb_id,
      chunk_index: idx,
      content,
      token_count: estimateTokens(content),
      embedding: `[${embeddings[idx].join(",")}]`,
      metadata: source_type === "faq" ? { faq_index: idx } : {},
    }));

    const { error: chunksErr } = await adminClient.from("kb_chunks").insert(rows);
    if (chunksErr) throw new Error(`Failed to insert chunks: ${chunksErr.message}`);

    await adminClient
      .from("kb_documents")
      .update({ status: "ready", processed_at: new Date().toISOString() })
      .eq("id", doc.id);

    const totalTokens = rows.reduce((s, r) => s + (r.token_count || 0), 0);
    return new Response(
      JSON.stringify({
        success: true,
        document_id: doc.id,
        chunks_count: chunks.length,
        total_tokens: totalTokens,
        elapsed_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errMsg = (e as Error).message;
    console.error(`[ingest-document] failed doc=${doc.id}: ${errMsg}`);
    await adminClient
      .from("kb_documents")
      .update({ status: "failed", error_message: errMsg.slice(0, 500) })
      .eq("id", doc.id);
    return jsonError(500, errMsg);
  }
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const wordsPerChunk = Math.max(Math.floor(chunkSize * 0.75), 50);
  const wordOverlap = Math.max(Math.floor(overlap * 0.75), 0);
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return [];
  const words = cleaned.split(" ");
  if (words.length <= wordsPerChunk) return [cleaned];
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunk = words.slice(start, end).join(" ");
    if (chunk) chunks.push(chunk);
    if (end === words.length) break;
    start = end - wordOverlap;
  }
  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function generateEmbeddings(texts: string[], model: string): Promise<number[][]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const batchSize = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const resp = await fetch(`${OPENAI_BASE}/embeddings`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: batch }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 300)}`);
    }
    const data = await resp.json();
    if (!Array.isArray(data?.data)) throw new Error("Invalid OpenAI response shape");
    for (const item of data.data) {
      if (!Array.isArray(item?.embedding)) throw new Error("Invalid embedding shape");
      results.push(item.embedding);
    }
  }
  return results;
}
