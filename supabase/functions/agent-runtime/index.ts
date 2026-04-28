import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthContext, handleCors } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_MODELS = [
  "google/gemini-2.5-flash-preview-04-17:free",
  "qwen/qwen3-30b-a3b:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "deepseek/deepseek-r1:free",
  "qwen/qwen3-14b:free",
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "gemma2-9b-it",
];

// Groq fallback: buffered call that returns SSE-compatible Response
async function streamFromGroq(
  messages: Array<{ role: string; content: string }>,
): Promise<Response | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? "";
  if (!apiKey) return null;
  for (const model of GROQ_MODELS) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
      });
      if (resp.ok) { console.log(`Groq fallback: streaming from ${model}`); return resp; }
    } catch { continue; }
  }
  return null;
}

// Stream directly from OpenRouter to client (avoids 30s timeout on Supabase edge functions)
async function streamFromOpenRouter(
  messages: Array<{ role: string; content: string }>,
  system: string,
): Promise<Response | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) { console.error("OPENROUTER_API_KEY not set"); return null; }
  const fullMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
  for (const model of FREE_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aikortex.com",
          "X-Title": "Aikortex",
        },
        body: JSON.stringify({ model, messages: fullMessages, stream: true, max_tokens: 2048 }),
      });
      clearTimeout(timeout);
      if ([400, 404, 429, 500, 502, 503].includes(resp.status)) {
        console.warn(`Model ${model} failed: ${resp.status}`); continue;
      }
      if (!resp.ok) { console.warn(`Model ${model} not ok: ${resp.status}`); continue; }
      console.log(`Streaming from ${model}`);
      return resp;
    } catch (e) {
      console.warn(`Model ${model} error: ${e}`); continue;
    }
  }
  // Groq fallback
  return streamFromGroq(fullMessages);
}

// Buffered (non-streaming) OpenRouter call for internal tasks like lead extraction
async function callOpenRouterBuffered(
  messages: Array<{ role: string; content: string }>,
  system: string,
): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) return "";
  const fullMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
  for (const model of FREE_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aikortex.com",
          "X-Title": "Aikortex",
        },
        body: JSON.stringify({ model, messages: fullMessages, stream: false, max_tokens: 512 }),
      });
      clearTimeout(timeout);
      if ([400, 404, 429, 500, 502, 503].includes(resp.status)) continue;
      if (!resp.ok) continue;
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || "";
      if (content) return content;
    } catch { continue; }
  }
  return "";
}

// BYOK: call provider API directly with user's own key (buffered, returns string)
async function callByok(
  messages: Array<{ role: string; content: string }>,
  system: string,
  provider: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const fullMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
  try {
    if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system,
          messages: messages.filter(m => m.role !== "system"),
        }),
      });
      if (!resp.ok) return "";
      const data = await resp.json();
      return data?.content?.[0]?.text || "";
    }

    if (provider === "gemini") {
      const geminiModel = model.replace("google/", "");
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: fullMessages.filter(m => m.role !== "system").map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          }),
        }
      );
      if (!resp.ok) return "";
      const data = await resp.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // OpenAI (and openai-compatible)
    const orModel = model.startsWith("openai/") ? model : `openai/${model}`;
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aikortex.com",
        "X-Title": "Aikortex",
      },
      body: JSON.stringify({ model: orModel, messages: fullMessages, max_tokens: 4096 }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error("callByok error:", e);
    return "";
  }
}

// ── SSE helpers ───────────────────────────────────────────────────────────
function streamText(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(ctrl) {
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = i === words.length - 1 ? words[i] : words[i] + " ";
        const payload = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
        ctrl.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
}

// ── Wizard setup prompt builder ───────────────────────────────────────────
function buildWizardPrompt(agentType: string): string {
  const questions: Record<string, string[]> = {
    sdr: [
      "Qual o nome do agente?",
      "Qual empresa ou negócio ele vai representar?",
      "Quais produtos ou serviços ele vai apresentar? Qual problema resolvem?",
      "Quem é o cliente ideal? (segmento, porte, cargo do decisor)",
      "Quais dados ele deve coletar obrigatoriamente do lead?",
      "Como deve qualificar? (ex: BANT, critérios de desqualificação)",
      "Como funciona o agendamento? (duração, fuso, quem conduz)",
      "Qual o tom de comunicação? Alguma regra crítica?",
    ],
    sac: [
      "Qual o nome do agente?",
      "Qual empresa ou negócio ele vai representar?",
      "Quais produtos ou serviços ele vai dar suporte?",
      "Quais dúvidas ou problemas mais comuns ele vai resolver?",
      "Qual o tom de comunicação? (empático, direto, técnico)",
      "Alguma regra importante que ele deve seguir?",
    ],
  };

  const qs = questions[agentType?.toLowerCase()] || [
    "Qual o nome do agente?",
    "Qual empresa ou negócio ele vai representar?",
    "Qual o objetivo principal do agente?",
    "Quem é o público-alvo?",
    "Qual o tom de comunicação?",
    "Alguma regra ou restrição importante?",
  ];

  return `Você é um configurador de agentes IA da Aikortex. Faça as perguntas abaixo em ordem, UMA por mensagem.

REGRAS OBRIGATÓRIAS:
- Máximo 1 frase por mensagem — só a pergunta, nada mais
- Sem introduções, sem exemplos, sem explicações
- Não cumprimente, não se apresente — vá direto à primeira pergunta
- Aguarde a resposta antes de fazer a próxima pergunta
- Responda SEMPRE em português do Brasil

PERGUNTAS (em ordem):
${qs.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Comece agora com a pergunta 1.`;
}

// ── System prompt builder ─────────────────────────────────────────────────
function buildSystemPrompt(agentConfig: Record<string, unknown>): string {
  const name        = String(agentConfig?.name         || "Assistente");
  const role        = String(agentConfig?.role        || "").toLowerCase();
  const objective   = String(agentConfig?.objective    || "");
  const instructions = String(agentConfig?.instructions || "");
  const tone        = String(agentConfig?.toneOfVoice  || "Profissional e Amigável");
  const company     = String(agentConfig?.companyName  || "");

  const isSdr = role.includes("sdr") || role.includes("vendas") || role.includes("sales") ||
                objective.toLowerCase().includes("qualific") ||
                objective.toLowerCase().includes("lead") ||
                instructions.toLowerCase().includes("bant");

  if (isSdr) {
    return `Você é ${name}, agente de SDR (Sales Development Representative)${company ? ` da ${company}` : ""}.

## Seu objetivo
${objective || "Qualificar leads, coletar dados de contato e agendar reuniões com leads qualificados."}

## Fluxo obrigatório
1. Apresente-se com nome do agente e da empresa.
2. Colete obrigatoriamente nome, email, telefone/WhatsApp, empresa e cargo.
3. Descubra a dor principal com perguntas abertas.
4. Qualifique com BANT (Budget, Authority, Need, Timeline), uma pergunta por vez.
5. Conecte a dor do lead ao valor da solução em 2-3 frases.
6. Avance para o agendamento propondo janelas objetivas de horário, confirmando fuso e duração.
7. Recapitule os dados do lead e o próximo passo.

## Instruções específicas
${instructions}

## Tom de voz
${tone}

## Regras obrigatórias
- Seja natural e conversacional — NUNCA pareça um formulário
- Faça UMA pergunta por vez, nunca várias ao mesmo tempo
- Ouça ativamente e faça perguntas de aprofundamento
- Quando o lead demonstrar interesse em agendar, confirme nome, email, telefone, empresa e cargo antes de encerrar
- Se o lead não tiver fit, registre como perdido com o motivo
- Não invente preços, prazos ou funcionalidades
- Responda SEMPRE em português do Brasil
- Ao concluir a conversa, encerre a última mensagem com um bloco técnico exatamente neste formato:

<<<CRM_LEAD>>>
{
  "name": "Nome completo do lead",
  "email": "email@dominio.com",
  "phone": "+55 11 99999-9999",
  "company": "Nome da empresa",
  "position": "Cargo",
  "stage": "agendado",
  "temperature": "quente",
  "value": 0,
  "source": "whatsapp",
  "notes": "Resumo da dor, contexto BANT e próximos passos",
  "meeting": {
    "scheduled_at": "2026-04-20T15:00:00-03:00",
    "duration_minutes": 15,
    "topic": "Reunião de descoberta"
  },
  "lost_reason": null
}
<<<END>>>

- Use stage="agendado" quando a reunião estiver confirmada, stage="qualificado" quando o lead pedir retorno posterior e stage="perdido" quando não houver fit.`;
  }

  return `Você é ${name}${company ? `, agente de IA da ${company}` : ", um agente de IA"}.

## Objetivo
${objective}

## Instruções
${instructions}

## Tom de voz
${tone}

## Regras
- Seja natural e conversacional
- Colete nome, email ou telefone e empresa do lead durante a conversa quando pertinente
- Responda sempre em português do Brasil`;
}

// ── Lead extractor — runs after every response ────────────────────────────
async function extractAndSaveLead(
  messages: Array<{ role: string; content: string }>,
  agentResponse: string,
  agentConfig: Record<string, unknown>,
  ctx: { supabase: ReturnType<typeof createClient>; userId: string; agentId?: string }
): Promise<void> {
  try {
    const role = String(agentConfig?.role || "").toLowerCase();
    const isSdr = role.includes("sdr") || role.includes("vendas") || role.includes("sales");

    const fullConvo = messages
      .map(m => `${m.role === "user" ? "Lead" : "Agente"}: ${m.content}`)
      .join("\n");

    const extractPrompt = isSdr
      ? `Analise esta conversa de SDR e extraia todos os dados disponíveis do lead.

CONVERSA COMPLETA:
${fullConvo}
ÚLTIMA RESPOSTA DO AGENTE: ${agentResponse.slice(0, 300)}

Retorne APENAS JSON válido com esta estrutura:
{
  "found": true,
  "name": "nome completo ou vazio",
  "email": "email ou vazio",
  "phone": "telefone/whatsapp ou vazio",
  "company": "empresa ou vazio",
  "notes": "resumo da conversa em 1-2 frases",
  "temperature": "frio|morno|quente",
  "bant_budget": "o que foi dito sobre orçamento/porte ou vazio",
  "bant_authority": "é decisor? quem mais decide? ou vazio",
  "bant_need": "qual a dor/necessidade principal ou vazio",
  "bant_timeline": "prazo/urgência mencionado ou vazio",
  "wants_meeting": true,
  "bant_score": 0
}

Regras:
- "temperature": "quente" se 3+ critérios BANT respondidos e quer agendar, "morno" se 1-2 critérios, "frio" se nenhum
- "bant_score": conte quantos dos 4 critérios BANT foram respondidos (0-4)
- "wants_meeting": true se o lead demonstrou interesse em agendar
- Se não há nome nem contato, retorne: {"found": false}
RETORNE SOMENTE O JSON.`
      : `Analise esta conversa e extraia dados do lead se houver NOME + (EMAIL ou TELEFONE).
Conversa: "${messages.filter(m => m.role === "user").map(m => m.content).join(" | ")}"
Última resposta: "${agentResponse.slice(0, 200)}"

Retorne APENAS JSON:
{"found": true/false, "name": "", "email": "", "phone": "", "company": "", "notes": "", "temperature": "frio|morno|quente"}
RETORNE SOMENTE O JSON.`;

    const rawContent = await callOpenRouterBuffered(
      [{ role: "user", content: extractPrompt }],
      "Você é um extrator de dados estruturados. Retorne SEMPRE JSON válido, sem texto extra."
    );
    if (!rawContent) return;

    const raw = rawContent
      .replace(/^```json\s*/gm, "").replace(/^```\s*/gm, "").replace(/```\s*$/gm, "").trim();

    let extracted: Record<string, unknown>;
    try { extracted = JSON.parse(raw); } catch { return; }

    if (!extracted.found || !extracted.name) return;

    const bantNotes = [
      extracted.bant_need     ? `Necessidade: ${extracted.bant_need}` : "",
      extracted.bant_budget   ? `Budget: ${extracted.bant_budget}` : "",
      extracted.bant_authority ? `Autoridade: ${extracted.bant_authority}` : "",
      extracted.bant_timeline  ? `Prazo: ${extracted.bant_timeline}` : "",
    ].filter(Boolean).join(" | ");

    const leadData = {
      user_id:     ctx.userId,
      agent_id:    ctx.agentId || null,
      name:        String(extracted.name    || ""),
      email:       String(extracted.email   || ""),
      phone:       String(extracted.phone   || ""),
      company:     String(extracted.company || ""),
      notes:       bantNotes || String(extracted.notes || ""),
      temperature: ["frio","morno","quente"].includes(String(extracted.temperature))
                     ? String(extracted.temperature) : "morno",
      stage:       extracted.wants_meeting ? "opportunity" : "lead",
      source:      "agent",
      value:       0,
      tags:        extracted.wants_meeting ? ["quer-agendar"] : [],
      activities: [{
        id: crypto.randomUUID(),
        type: "note",
        description: `Lead qualificado pelo agente SDR. Score BANT: ${extracted.bant_score ?? 0}/4.${extracted.wants_meeting ? " Lead quer agendar reunião." : ""}`,
        createdAt: new Date().toISOString(),
        createdBy: String(agentConfig?.name || "Agente IA"),
      }],
    };

    if (leadData.email) {
      await ctx.supabase.from("leads")
        .upsert(leadData, { onConflict: "user_id,email" });
    } else {
      const { data: existing } = await ctx.supabase.from("leads")
        .select("id").eq("user_id", ctx.userId).ilike("name", leadData.name).maybeSingle();
      if (!existing) {
        await ctx.supabase.from("leads").insert(leadData);
      } else {
        await ctx.supabase.from("leads")
          .update({
            notes: leadData.notes,
            temperature: leadData.temperature,
            stage: leadData.stage,
            tags: leadData.tags,
          })
          .eq("id", existing.id);
      }
    }

    console.log(`Lead saved: ${leadData.name} | BANT: ${extracted.bant_score ?? 0}/4 | ${leadData.temperature}`);
  } catch (e) {
    console.error("extractAndSaveLead error:", e);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const authResult = await getAuthContext(req);
  if (authResult instanceof Response) return authResult;
  // const { user, profile, agencyId, supabase } = authResult;

  try {
    const body = await req.json();
    const {
      messages = [],
      agentConfig = {},
      agentId,
      contactId = "browser-test",
      channel = "chat",
    } = body;

    const supabaseUrl    = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase       = createClient(supabaseUrl, serviceRoleKey);

    const userId   = String(body.userId || "anonymous");
    const mode     = String(body.mode || "chat");
    const system   = mode === "wizard-setup"
      ? buildWizardPrompt(String(body.agentType || agentConfig?.role || "custom"))
      : buildSystemPrompt(agentConfig);

    const byokKey      = String(body.byok_key || "");
    const byokProvider = String(body.provider || "");
    const byokModel    = String(body.model_override || "");

    const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream" };

    // ── BYOK path (buffered, then stream via streamText) ──
    if (byokKey && byokProvider && byokModel) {
      const content = await callByok(messages, system, byokProvider, byokModel, byokKey);
      if (!content) {
        return new Response(
          streamText("⚠️ Chave de API inválida ou modelo indisponível. Verifique suas configurações."),
          { headers: sseHeaders }
        );
      }
      if (userId !== "anonymous" && mode !== "wizard-setup") {
        const ctx = { supabase, userId, agentId };
        Promise.all([
          extractAndSaveLead(messages, content, agentConfig, ctx),
          agentId ? supabase.from("conversations").upsert({
            user_id: userId, agent_id: agentId, contact_id: contactId, channel,
            messages: [...messages, { role: "assistant", content }],
          }, { onConflict: "agent_id,contact_id,channel" }) : Promise.resolve(),
        ]).catch(e => console.error("background tasks error:", e));
      }
      return new Response(streamText(content), { headers: sseHeaders });
    }

    // ── Free path: stream SSE directly from OpenRouter ──
    const orResp = await streamFromOpenRouter(messages, system);

    if (!orResp || !orResp.body) {
      return new Response(
        streamText("⚠️ Serviço de IA temporariamente indisponível. Tente novamente em instantes."),
        { headers: sseHeaders }
      );
    }

    // Tee the stream: one branch pipes to client, other buffers for lead extraction
    if (userId !== "anonymous" && mode !== "wizard-setup") {
      const [forClient, forBuffer] = orResp.body.tee();

      // Buffer for lead extraction in background
      (async () => {
        try {
          const reader = forBuffer.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                fullContent += parsed?.choices?.[0]?.delta?.content || "";
              } catch { /* skip malformed */ }
            }
          }
          if (fullContent) {
            const ctx = { supabase, userId, agentId };
            await Promise.all([
              extractAndSaveLead(messages, fullContent, agentConfig, ctx),
              agentId ? supabase.from("conversations").upsert({
                user_id: userId, agent_id: agentId, contact_id: contactId, channel,
                messages: [...messages, { role: "assistant", content: fullContent }],
              }, { onConflict: "agent_id,contact_id,channel" }) : Promise.resolve(),
            ]);
          }
        } catch (e) { console.error("buffer/lead extraction error:", e); }
      })();

      return new Response(forClient, { headers: sseHeaders });
    }

    // Anonymous or wizard: just pipe stream directly
    return new Response(orResp.body, { headers: sseHeaders });

  } catch (e) {
    console.error("agent-runtime error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(
      streamText(`⚠️ ${msg}`),
      { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
    );
  }
});
