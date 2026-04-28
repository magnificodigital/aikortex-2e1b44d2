const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages } = await req.json()
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')

    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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
Sempre responda em português do Brasil. Seja conversacional e útil.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://aikortex.com',
        'X-Title': 'Aikortex Flow Copilot',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
