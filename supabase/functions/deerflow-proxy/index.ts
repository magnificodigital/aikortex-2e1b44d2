import { handleCors, getAuthContext, corsHeaders } from "../_shared/auth.ts";
import { callLLM, buildAdminClient } from "../_shared/llm-fallback.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const authResult = await getAuthContext(req);
  if (authResult instanceof Response) return authResult;

  try {
    const { messages } = await req.json();

    const systemPrompt = `Você é um assistente de criação de fluxos de automação para a plataforma Aikortex, usada por agências de marketing no Brasil. Ajude o usuário a criar fluxos de automação fazendo perguntas para entender o objetivo. Quando tiver informações suficientes, gere o fluxo como JSON dentro de um bloco de código assim:
\`\`\`json
{
  "nodes": [
    { "id": "1", "type": "trigger", "position": {"x": 100, "y": 100}, "data": {"label": "WhatsApp Recebido", "config": {}} },
    { "id": "2", "type": "condition", "position": {"x": 100, "y": 250}, "data": {"label": "Lead qualificado?", "config": {}} },
    { "id": "3", "type": "action", "position": {"x": 100, "y": 400}, "data": {"label": "Registrar no CRM", "config": {}} }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" },
    { "id": "e2-3", "source": "2", "target": "3" }
  ]
}
\`\`\`
Sempre responda em português do Brasil. Seja conversacional e útil.`;

    // DeerFlow é orquestração — usa tier paid com gpt-4o-mini preferido.
    // Helper faz fallback para outros paid em caso de falha; NÃO degrada para free.
    const result = await callLLM(
      [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      {
        tier: "paid",
        preferredModel: "openai/gpt-4o-mini",
        maxTokens: 2048,
        timeoutMs: 20000,
      },
      buildAdminClient(),
    );

    if (!result.success) {
      const status = result.status_code === 429 ? 429 : result.status_code === 402 ? 402 : 500;
      return new Response(
        JSON.stringify({ error: result.error || "Serviço de IA indisponível." }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Preserve previous response shape (callers expect OpenRouter raw format)
    return new Response(
      JSON.stringify(result.raw ?? {
        choices: [{ message: { content: result.content } }],
        model: result.model_used,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
