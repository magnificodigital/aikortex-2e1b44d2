import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um mentor de vendas experiente que acompanha reuniões de vendas em tempo real. Seu papel é guiar o vendedor (host da reunião) com sugestões práticas e discretas.

REGRAS:
- Responda SEMPRE em português brasileiro
- Seja conciso e direto (máximo 3-4 frases por sugestão)
- Use bullet points quando listar ações
- Foque em técnicas de vendas consultivas
- Adapte suas sugestões ao contexto da conversa

QUANDO O VENDEDOR INICIAR A CALL, sugira:
- Como se apresentar de forma impactante
- Perguntas de descoberta para entender a dor do cliente

DURANTE A CONVERSA, ajude com:
- Técnicas de rapport e conexão
- Perguntas estratégicas para qualificação (BANT, SPIN, etc.)
- Como lidar com objeções comuns
- Quando e como apresentar a solução
- Sinais de compra para identificar

PARA FECHAMENTO, oriente:
- Técnicas de fechamento adequadas ao momento
- Como criar urgência sem pressionar
- Próximos passos claros

Use emojis com moderação para tornar a leitura rápida. Formate com markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, meetingTitle } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextMessage = meetingTitle
      ? `\n\nContexto: A reunião se chama "${meetingTitle}".`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextMessage },
          ...messages,
        ],
        stream: true,
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sales-mentor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
