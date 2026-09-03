import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { callLLM, buildAdminClient } from "../_shared/llm-fallback.ts";

// Bateria de testes (Clint-style): a IA gera clientes fictícios (personas) e
// conversa com o agente no lugar do usuário, mostrando onde ele acerta e erra.
// - action "generate": gera N personas a partir do agente + modo.
// - action "run": roda 1 persona (conversa persona↔agente por poucos turnos) +
//   avalia (verdict + notas). Rodado 1 por request pra não estourar timeout.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WIZARD_MODEL = "google/gemini-2.5-flash";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Monta o contexto do agente a partir do config (fiel o bastante pro teste).
function agentContextFromConfig(name: string, cfg: Record<string, any>) {
  const ctx = cfg.businessContext ?? {};
  const instructions = cfg?.profile?.instructions ?? cfg.instructions ?? "";
  const tone = ctx.toneOfVoice ?? cfg.toneOfVoice ?? "profissional e cordial";
  const objective = cfg?.profile?.primaryGoal ?? cfg.objective ?? "";
  const niche = ctx.niche ?? "";
  const company = ctx.companyName ?? "";
  const greeting = ctx.greetingMessage ?? cfg.greetingMessage ?? "";
  return { name, instructions, tone, objective, niche, company, greeting };
}

const MODE_HINT: Record<string, string> = {
  balanced: "misture perfis: alguns fáceis, alguns com objeções, alguns com dúvidas.",
  objections: "clientes DIFÍCEIS que levantam objeções (preço, concorrência, desconfiança, sem tempo).",
  doubts: "clientes cheios de DÚVIDAS (como funciona, prazos, o que está incluído, segurança).",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authResult = await getAuthContext(req);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await req.json();
    const action = body.action as string;
    const agentId = body.agentId as string;
    const mode = (body.mode as string) || "balanced";
    if (!agentId) return json({ error: "agentId obrigatório" }, 400);

    const admin = buildAdminClient();
    const { data: agent } = await (admin as any)
      .from("user_agents").select("name, config, agent_type").eq("id", agentId).maybeSingle();
    if (!agent) return json({ error: "Agente não encontrado" }, 404);

    const ac = agentContextFromConfig(agent.name, (agent.config ?? {}) as Record<string, any>);

    // ── GERAR PERSONAS ──
    if (action === "generate") {
      const count = Math.min(Math.max(Number(body.count) || 6, 1), 6);
      const tools = [{
        type: "function",
        function: {
          name: "make_personas",
          description: "Gera personas de clientes fictícios pra testar o agente.",
          parameters: {
            type: "object",
            properties: {
              personas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nome do cliente fictício" },
                    profile: { type: "string", description: "1 frase: quem é e o contexto" },
                    goal: { type: "string", description: "O que ele quer nessa conversa" },
                    style: { type: "string", description: "Jeito de falar (ex: apressado, cético, curioso)" },
                    opening: { type: "string", description: "Primeira mensagem que ele manda pro agente (natural, WhatsApp, pt-BR)" },
                  },
                  required: ["name", "profile", "goal", "style", "opening"],
                },
              },
            },
            required: ["personas"],
          },
        },
      }];
      const result = await callLLM(
        [
          { role: "system", content: `Você cria personas de clientes fictícios pra testar um agente de IA. Gere ${count} personas variadas e realistas pro nicho, ${MODE_HINT[mode] ?? MODE_HINT.balanced} Idioma pt-BR. Responda só chamando make_personas.` },
          { role: "user", content: `Agente a ser testado:\nNome: ${ac.name}\nNicho: ${ac.niche || "geral"}\nEmpresa: ${ac.company || "-"}\nObjetivo: ${ac.objective || "-"}\nInstruções (resumo): ${String(ac.instructions).slice(0, 800)}` },
        ],
        { preferredModel: WIZARD_MODEL, tier: "free", toolsRequired: true, tools, toolChoice: { type: "function", function: { name: "make_personas" } }, maxTokens: 1800, timeoutMs: 30000 },
        admin,
      );
      if (!result.success) return json({ error: result.error || "Erro ao gerar personas" }, result.status_code === 402 ? 402 : 500);
      const args = (result.toolCalls as any[] | undefined)?.[0]?.function?.arguments;
      const parsed = typeof args === "string" ? JSON.parse(args) : (args ?? {});
      return json({ ok: true, personas: parsed.personas ?? [] });
    }

    // ── RODAR 1 PERSONA ──
    if (action === "run") {
      const persona = body.persona as { name: string; profile: string; goal: string; style: string; opening: string };
      if (!persona?.opening) return json({ error: "persona inválida" }, 400);

      const agentSystem = `Você é ${ac.name}, agente de IA${ac.company ? ` da ${ac.company}` : ""}. Objetivo: ${ac.objective || "ajudar o cliente"}. Tom: ${ac.tone}. Idioma pt-BR, mensagens curtas (máx 3 linhas). Instruções:\n${String(ac.instructions).slice(0, 2000)}`;
      const personaSystem = `Você é ${persona.name}, um CLIENTE fictício conversando com o agente de uma empresa no WhatsApp. Contexto: ${persona.profile}. Seu objetivo: ${persona.goal}. Jeito de falar: ${persona.style}. Responda SEMPRE como o cliente (curto, natural, pt-BR), nunca como o agente. Se o agente resolver seu ponto, você pode encerrar agradecendo.`;

      // transcript: [{ role: "persona"|"agent", text }]
      const transcript: { role: "persona" | "agent"; text: string }[] = [];
      transcript.push({ role: "persona", text: persona.opening });

      const MAX_AGENT_TURNS = 3;
      for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
        // Agente responde
        const agentMsgs = [
          { role: "system", content: agentSystem },
          ...transcript.map((m) => ({ role: m.role === "agent" ? "assistant" : "user", content: m.text })),
        ];
        const ar = await callLLM(agentMsgs, { preferredModel: WIZARD_MODEL, tier: "free", maxTokens: 400, timeoutMs: 25000 }, admin);
        if (!ar.success) break;
        const agentText = (ar.content || "").trim();
        if (!agentText) break;
        transcript.push({ role: "agent", text: agentText });

        if (turn === MAX_AGENT_TURNS - 1) break;

        // Persona responde
        const personaMsgs = [
          { role: "system", content: personaSystem },
          // pro persona, o AGENTE é o "outro" (user) e ELE é o assistant
          ...transcript.map((m) => ({ role: m.role === "persona" ? "assistant" : "user", content: m.text })),
        ];
        const pr = await callLLM(personaMsgs, { preferredModel: WIZARD_MODEL, tier: "free", maxTokens: 200, timeoutMs: 25000 }, admin);
        if (!pr.success) break;
        const personaText = (pr.content || "").trim();
        if (!personaText) break;
        transcript.push({ role: "persona", text: personaText });
        if (/obrigad|valeu|era isso|resolvido|perfeito, at[ée]/i.test(personaText)) break;
      }

      // Avaliação
      const evalTools = [{
        type: "function",
        function: {
          name: "evaluate",
          description: "Avalia se o agente atendeu bem a persona.",
          parameters: {
            type: "object",
            properties: {
              verdict: { type: "string", enum: ["good", "issues", "bad"], description: "good=atendeu bem, issues=ok mas com falhas, bad=falhou" },
              score: { type: "integer", description: "0 a 100" },
              highlights: { type: "array", items: { type: "string" }, description: "1-3 pontos (o que acertou/errou)" },
            },
            required: ["verdict", "score", "highlights"],
          },
        },
      }];
      const conv = transcript.map((m) => `${m.role === "agent" ? ac.name : persona.name}: ${m.text}`).join("\n");
      const er = await callLLM(
        [
          { role: "system", content: `Você avalia a conversa entre um agente de IA e um cliente. O objetivo do agente é: ${ac.objective || "atender bem e avançar a conversa"}. Julgue se o agente atendeu bem (clareza, resolveu a dúvida/objeção, avançou pro próximo passo, tom adequado, sem inventar). Responda só chamando evaluate. pt-BR.` },
          { role: "user", content: conv },
        ],
        { preferredModel: WIZARD_MODEL, tier: "free", toolsRequired: true, tools: evalTools, toolChoice: { type: "function", function: { name: "evaluate" } }, maxTokens: 500, timeoutMs: 25000 },
        admin,
      );
      let evaluation: any = { verdict: "issues", score: 60, highlights: ["Avaliação indisponível"] };
      if (er.success) {
        const a = (er.toolCalls as any[] | undefined)?.[0]?.function?.arguments;
        try { evaluation = typeof a === "string" ? JSON.parse(a) : (a ?? evaluation); } catch { /* keep default */ }
      }

      return json({ ok: true, transcript, evaluation });
    }

    return json({ error: "action inválida (generate|run)" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Erro inesperado" }, 500);
  }
});
