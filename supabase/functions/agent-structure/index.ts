import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, agent_type, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const operationalRules = `
REGRAS OPERACIONAIS OBRIGATÓRIAS para tipos SDR/BDR/SAC/CS:
1. As "instructions" devem detalhar etapas concretas: saudação, identificação, descoberta, qualificação BANT, apresentação de valor, agendamento e confirmação.
2. Para SDR/BDR: deve incluir explicitamente "ao final da conversa, finalize a mensagem com o bloco técnico <<<CRM_LEAD>>>{...JSON...}<<<END>>> contendo nome, email, telefone, empresa, cargo, stage (agendado|qualificado|perdido), temperature, source, notes, lost_reason e meeting{scheduled_at, duration_minutes, topic}".
3. As instruções devem orientar a fazer UMA pergunta por vez, confirmar antes de avançar e não inventar preços.
4. greeting_message deve ser caloroso, identificar empresa e abrir espaço para o lead falar da dor.`;

    const systemPrompt = `Você é um especialista em configurar agentes de IA conversacionais funcionais ponta-a-ponta.
Dado a descrição do usuário, gere uma configuração estruturada completa para o agente.
Responda APENAS chamando a tool "structure_agent" com os dados preenchidos.
Adapte o tom, mensagem de saudação e funcionalidades ao tipo de agente (${agent_type || "Custom"}).
Idioma padrão: ${language || "pt-BR"}.
${agent_type && agent_type !== "Custom" ? operationalRules : ""}
Seja criativo mas realista nas funcionalidades sugeridas.`;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_agent",
              description: "Return the structured agent configuration.",
              parameters: {
                type: "object",
                properties: {
                  agent_name: { type: "string", description: "Nome do agente" },
                  agent_type: { type: "string", description: "Tipo: SDR, BDR, SAC, CS ou Custom" },
                  description: { type: "string", description: "Descrição curta do agente (1-2 frases)" },
                  objective: { type: "string", description: "Objetivo principal do agente" },
                  tone: {
                    type: "string",
                    enum: ["professional_friendly", "formal", "casual", "empathetic", "direct"],
                    description: "Tom de voz",
                  },
                  language: { type: "string", description: "Idioma (ex: pt-BR)" },
                  greeting_message: { type: "string", description: "Mensagem de saudação inicial" },
                  instructions: { type: "string", description: "Instruções detalhadas de comportamento" },
                  channels: {
                    type: "array",
                    items: { type: "string" },
                    description: "Canais de atuação (whatsapp, web, instagram, etc)",
                  },
                  quick_replies: {
                    type: "array",
                    items: { type: "string" },
                    description: "Respostas rápidas sugeridas (3-5)",
                  },
                  selected_features: {
                    type: "array",
                    items: { type: "string" },
                    description: "Funcionalidades principais do agente (3-6 palavras-chave)",
                  },
                  onboarding_level: {
                    type: "string",
                    enum: ["none", "soft", "strict"],
                    description: "Nível de onboarding",
                  },
                },
                required: [
                  "agent_name", "agent_type", "description", "objective", "tone",
                  "language", "greeting_message", "instructions", "channels",
                  "selected_features", "onboarding_level",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_agent" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "IA não retornou configuração estruturada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let structuredConfig;
    try {
      structuredConfig = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch (e) {
      console.error("JSON parse error:", e, toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ structuredConfig }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-structure error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
