import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthContext, corsHeaders } from "../_shared/auth.ts";

type FaqItem = { question: string; answer: string };
type IngestPayload =
  | { kb_id: string; source_type: "text"; title: string; raw_content: string }
  | { kb_id: string; source_type: "faq"; title: string; faqs: FaqItem[] }
  | { kb_id: string; source_type: "file"; title: string; storage_path: string }
  | { kb_id: string; source_type: "url"; title: string; url: string };

const OPENAI_BASE = "https://api.openai.com/v1";
const ALLOWED_TYPES = ["text", "faq", "file", "url"];
const MAX_TEXT_CHARS = 1_000_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5MB

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
  if (!ALLOWED_TYPES.includes(source_type)) {
    return jsonError(400, `Unsupported source_type: ${source_type}`);
  }

  // 1. Validate ownership
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

  // 2. Compute source_uri
  let sourceUri: string | null = null;
  if (source_type === "file") sourceUri = (body as any).storage_path;
  else if (source_type === "url") sourceUri = (body as any).url;

  // 3. Create document row (status=processing). Metadata enriched after extraction.
  const { data: doc, error: docErr } = await adminClient
    .from("kb_documents")
    .insert({
      knowledge_base_id: kb_id,
      source_type,
      title,
      source_uri: sourceUri,
      raw_content: source_type === "text" ? (body as any).raw_content ?? "" : null,
      status: "processing",
      metadata: {},
    })
    .select()
    .single();

  if (docErr || !doc) return jsonError(500, `Failed to create document: ${docErr?.message}`);

  const startedAt = Date.now();

  try {
    // 4. Build chunks per source type
    let chunks: string[] = [];
    let extraMetadata: Record<string, any> = {};

    if (source_type === "text") {
      const raw = (body as any).raw_content ?? "";
      chunks = chunkText(raw, kb.chunk_size, kb.chunk_overlap);
      extraMetadata = { raw_chars: raw.length };
    } else if (source_type === "faq") {
      const faqs: FaqItem[] = (body as any).faqs ?? [];
      if (!Array.isArray(faqs) || faqs.length === 0) throw new Error("faqs must be non-empty array");
      chunks = faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`);
      extraMetadata = { faqs_count: faqs.length };
    } else if (source_type === "file") {
      const extracted = await extractFromFile((body as any).storage_path, adminClient);
      chunks = chunkText(extracted.text, kb.chunk_size, kb.chunk_overlap);
      extraMetadata = extracted.metadata;
    } else if (source_type === "url") {
      const extracted = await extractFromUrl((body as any).url);
      chunks = chunkText(extracted.text, kb.chunk_size, kb.chunk_overlap);
      extraMetadata = extracted.metadata;
    }

    if (chunks.length === 0) throw new Error("No chunks produced (empty content?)");
    if (chunks.length > 500) throw new Error(`Too many chunks (${chunks.length}). Max 500 per document.`);

    // 5. Embeddings
    const modelId = kb.embedding_model.replace(/^openai\//, "");
    const embeddings = await generateEmbeddings(chunks, modelId);

    if (embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`);
    }
    if (embeddings[0].length !== kb.embedding_dim) {
      throw new Error(`Embedding dim mismatch: got ${embeddings[0].length}, expected ${kb.embedding_dim}`);
    }

    // 6. Insert chunks
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
      .update({
        status: "ready",
        processed_at: new Date().toISOString(),
        metadata: extraMetadata,
      })
      .eq("id", doc.id);

    const totalTokens = rows.reduce((s, r) => s + (r.token_count || 0), 0);
    return new Response(
      JSON.stringify({
        success: true,
        document_id: doc.id,
        chunks_count: chunks.length,
        total_tokens: totalTokens,
        elapsed_ms: Date.now() - startedAt,
        metadata: extraMetadata,
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

function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ───── File extraction ──────────────────────────────────────────────────────
async function extractFromFile(
  storagePath: string,
  adminClient: any,
): Promise<{ text: string; metadata: Record<string, any> }> {
  if (!storagePath || !storagePath.includes("/")) {
    throw new Error("Invalid storage_path format (expected <agent_id>/<filename>)");
  }

  const { data: fileBlob, error } = await adminClient.storage.from("kb-files").download(storagePath);
  if (error || !fileBlob) throw new Error(`Failed to download file: ${error?.message ?? "unknown"}`);

  const filename = storagePath.split("/").pop()!;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  const sizeBytes = fileBlob.size;
  if (sizeBytes > MAX_FILE_BYTES) {
    throw new Error(`File too large: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  let text: string;

  switch (ext) {
    case "txt":
    case "md":
      text = new TextDecoder("utf-8").decode(arrayBuffer);
      break;
    case "pdf":
      text = await extractPdfText(arrayBuffer);
      break;
    case "docx":
      text = await extractDocxText(arrayBuffer);
      break;
    default:
      throw new Error(`Unsupported file extension: .${ext}. Accepted: txt, md, pdf, docx`);
  }

  text = sanitizeText(text);
  if (!text) throw new Error("No text extracted from file");
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`Extracted text too large: ${text.length} chars (max 1M)`);
  }

  return {
    text,
    metadata: {
      filename,
      extension: ext,
      size_bytes: sizeBytes,
      extracted_chars: text.length,
    },
  };
}

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  // Use `unpdf` — purpose-built for serverless/Deno, no worker dependency.
  const { extractText } = await import("https://esm.sh/unpdf@0.12.1");
  const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth: any = await import("https://esm.sh/mammoth@1.6.0");
  const lib = mammoth.default ?? mammoth;
  const result = await lib.extractRawText({ arrayBuffer });
  return result.value ?? "";
}

// ───── URL extraction ───────────────────────────────────────────────────────
async function extractFromUrl(url: string): Promise<{ text: string; metadata: Record<string, any> }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http/https URLs allowed");
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname === "::1"
  ) {
    throw new Error("URL points to internal address");
  }

  const resp = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent": "Aikortex-KB-Scraper/1.0 (+https://aikortex26.lovable.app)",
      Accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!resp.ok) throw new Error(`URL fetch failed: HTTP ${resp.status}`);

  const contentType = resp.headers.get("content-type") ?? "";
  const contentLength = parseInt(resp.headers.get("content-length") ?? "0", 10);
  if (contentLength && contentLength > MAX_HTML_BYTES) {
    throw new Error(`Page too large: ${(contentLength / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
  }

  const raw = await resp.text();
  if (raw.length > MAX_HTML_BYTES) {
    throw new Error(`Page too large: ${(raw.length / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
  }

  let text: string;
  if (contentType.includes("html") || contentType.includes("xhtml")) {
    text = await extractTextFromHtml(raw);
  } else if (contentType.includes("text/plain") || contentType.includes("text/markdown") || contentType === "") {
    text = raw;
  } else {
    throw new Error(`Unsupported content-type: ${contentType}`);
  }

  text = sanitizeText(text);
  if (!text) throw new Error("No text extracted from URL");
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`Extracted text too large: ${text.length} chars (max 1M)`);
  }

  return {
    text,
    metadata: {
      url: parsedUrl.toString(),
      hostname: parsedUrl.hostname,
      content_type: contentType,
      raw_size_bytes: raw.length,
      extracted_chars: text.length,
    },
  };
}

async function extractTextFromHtml(html: string): Promise<string> {
  const { DOMParser } = await import("https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts");
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return "";

  ["script", "style", "noscript", "iframe", "svg", "nav", "footer", "header", "aside"].forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el: any) => el.remove?.());
  });

  const root = (doc as any).body || doc.documentElement;
  return root?.textContent ?? "";
}

// ───── Embeddings ───────────────────────────────────────────────────────────
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
