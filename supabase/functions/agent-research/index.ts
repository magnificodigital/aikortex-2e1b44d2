import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { callLLM, buildAdminClient } from "../_shared/llm-fallback.ts";

// Auto-research (Clint-style): recebe a URL do site do negócio, lê a página,
// e a IA extrai o contexto (empresa, nicho, produtos, tom, FAQ) pra pré-preencher
// o agente e semear a base de conhecimento. MVP = 1 página; DeerFlow real depois
// aprofunda (multi-página, Instagram, síntese).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extrai texto legível do HTML (remove script/style/tags), normaliza espaços.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(raw: string): string | null {
  let u = (raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authResult = await getAuthContext(req);
  if (authResult instanceof Response) return authResult;

  try {
    const { url } = await req.json();
    const target = normalizeUrl(url);
    if (!target) {
      return new Response(
        JSON.stringify({ error: "URL inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Busca a página com timeout curto (não travar a criação do agente).
    let pageText = "";
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const resp = await fetch(target, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AikortexBot/1.0; +https://app.aikortex.com)",
          "Accept": "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(t);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const ct = resp.headers.get("content-type") ?? "";
      if (!ct.includes("text/html") && !ct.includes("text/plain")) {
        throw new Error("Conteúdo não é HTML");
      }
      const html = await resp.text();
      pageText = htmlToText(html).slice(0, 12000); // limita o contexto pro LLM
    } catch (e) {
      return new Response(
        JSON.stringify({ error: `Não consegui ler o site: ${(e as Error).message}. Confere a URL ou descreve o negócio manualmente.` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (pageText.length < 120) {
      return new Response(
        JSON.stringify({ error: "O site tem pouco texto legível (pode ser só imagens/JS). Descreve o negócio manualmente." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) IA extrai o contexto do negócio (structured output via tool).
    const tools = [
      {
        type: "function",
        function: {
          name: "extract_business",
          description: "Extrai o contexto do negócio a partir do texto do site.",
          parameters: {
            type: "object",
            properties: {
              company_name: { type: "string", description: "Nome da empresa/negócio" },
              niche: { type: "string", description: "Nicho/setor em 1-3 palavras (ex: Imobiliária, Clínica odontológica, E-commerce de moda)" },
              summary: { type: "string", description: "Resumo do negócio em 1-2 frases (o que faz, pra quem)" },
              products: { type: "array", items: { type: "string" }, description: "Produtos/serviços principais (3-6)" },
              audience: { type: "string", description: "Público-alvo (B2B, consumidor final, etc.)" },
              tone: { type: "string", description: "Tom de voz sugerido pra marca (ex: profissional e acolhedor)" },
              faq: {
                type: "array",
                description: "3-6 perguntas frequentes prováveis com respostas curtas, pra semear a base de conhecimento",
                items: {
                  type: "object",
                  properties: { q: { type: "string" }, a: { type: "string" } },
                  required: ["q", "a"],
                },
              },
            },
            required: ["company_name", "niche", "summary", "products", "audience", "tone", "faq"],
            additionalProperties: false,
          },
        },
      },
    ];

    const result = await callLLM(
      [
        { role: "system", content: "Você lê o texto de um site e extrai o contexto do negócio de forma fiel (não invente o que não está no texto). Responda APENAS chamando a tool extract_business. Idioma pt-BR." },
        { role: "user", content: `Texto do site (${target}):\n\n${pageText}` },
      ],
      {
        preferredModel: "google/gemini-2.5-flash",
        tier: "free",
        toolsRequired: true,
        tools,
        toolChoice: { type: "function", function: { name: "extract_business" } },
        maxTokens: 1500,
        timeoutMs: 30000,
      },
      buildAdminClient(),
    );

    if (!result.success) {
      const status = result.status_code === 429 ? 429 : result.status_code === 402 ? 402 : 500;
      return new Response(
        JSON.stringify({ error: result.error || "Erro no serviço de IA" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extrai os args da tool call (mesmo padrão do agent-structure)
    const toolCall = (result.toolCalls as any[] | undefined)?.[0];
    let extracted: Record<string, unknown> = {};
    try {
      const args = toolCall?.function?.arguments;
      extracted = typeof args === "string" ? JSON.parse(args) : (args ?? {});
    } catch {
      extracted = {};
    }
    if (!extracted || Object.keys(extracted).length === 0) {
      return new Response(
        JSON.stringify({ error: "A IA não conseguiu extrair o contexto do site. Descreve o negócio manualmente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, source: target, business: extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
