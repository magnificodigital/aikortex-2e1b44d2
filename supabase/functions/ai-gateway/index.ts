import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENROUTER_KEY = () => Deno.env.get('OPENROUTER_API_KEY') ?? ''
const GROQ_KEY       = () => Deno.env.get('GROQ_API_KEY') ?? ''

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const adminClient   = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Confirmed-working free models on OpenRouter (April 2026) ──────────────
const FREE_MODELS = [
  'google/gemini-2.5-flash-preview-04-17:free',
  'qwen/qwen3-30b-a3b:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen3-14b:free',
]

// ── Groq models (free, fast, reliable) ────────────────────────────────────
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'gemma2-9b-it',
]

const MODULE_MODELS: Record<string, string[]> = {
  agent:      FREE_MODELS,
  app:        FREE_MODELS,
  flow:       FREE_MODELS,
  multiagent: FREE_MODELS,
  structure:  FREE_MODELS,
  default:    FREE_MODELS,
}

const BYOK_MODELS: Record<string, Record<string, string>> = {
  openai:     { fast: 'openai/gpt-4o-mini',             smart: 'openai/gpt-4o' },
  gemini:     { fast: 'google/gemini-2.0-flash-exp',    smart: 'google/gemini-2.5-pro' },
  anthropic:  { fast: 'anthropic/claude-3-5-haiku',     smart: 'anthropic/claude-sonnet-4-6' },
  deepseek:   { fast: 'deepseek/deepseek-chat',         smart: 'deepseek/deepseek-r1' },
}

// ── Try models with automatic fallback ────────────────────────────────────
async function callWithFallback(
  messages: Array<{ role: string; content: string }>,
  models: string[],
  apiKey: string,
  options: { stream?: boolean; jsonMode?: boolean; maxTokens?: number }
): Promise<Response> {
  const body: Record<string, unknown> = {
    messages,
    stream: options.stream ?? false,
    max_tokens: options.maxTokens ?? 4096,
  }
  if (options.jsonMode && !options.stream) {
    body.response_format = { type: 'json_object' }
  }

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aikortex.com',
          'X-Title': 'Aikortex',
        },
        body: JSON.stringify({ ...body, model }),
      })

      // Retry on any recoverable error
      if ([400, 404, 429, 500, 502, 503].includes(response.status)) {
        console.warn(`Model ${model} failed (${response.status}), trying next...`)
        continue
      }

      return response
    } catch (e) {
      console.warn(`Model ${model} fetch error: ${e}, trying next...`)
      continue
    }
  }

  // Groq fallback (free, fast, reliable)
  const groqKey = GROQ_KEY()
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...body, model, stream: false }),
        })
        if (r.ok) return r
      } catch { continue }
    }
  }

  return new Response(
    JSON.stringify({ error: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.' }),
    { status: 429 }
  )
}

// ── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ── Auth: require valid JWT (user) or service role key ──────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  // Allow internal service-role calls
  if (token !== SERVICE_KEY) {
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const body = await req.json()
    const {
      messages,
      system,
      module = 'default',
      mode = 'chat',
      provider,
      byok_key,
      quality = 'fast',
      model_override,
    } = body

    const orKey = OPENROUTER_KEY()
    if (!orKey) {
      return new Response(JSON.stringify({ error: 'Gateway não configurado.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const finalMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages

    const isStream   = mode === 'stream'
    const isJsonMode = mode === 'structure' || mode === 'build'

    // BYOK path
    if (byok_key && provider && BYOK_MODELS[provider]) {
      const model    = model_override || BYOK_MODELS[provider][quality] || BYOK_MODELS[provider].fast
      const response = await callWithFallback(finalMessages, [model], byok_key, {
        stream: isStream, jsonMode: isJsonMode, maxTokens: isJsonMode ? 8192 : 4096,
      })
      return await buildResponse(response, isStream, corsHeaders)
    }

    // Free models with fallback
    const models   = model_override ? [model_override] : (MODULE_MODELS[module] ?? MODULE_MODELS.default)
    const response = await callWithFallback(finalMessages, models, orKey, {
      stream: isStream, jsonMode: isJsonMode, maxTokens: isJsonMode ? 8192 : 4096,
    })
    return await buildResponse(response, isStream, corsHeaders)

  } catch (e) {
    console.error('ai-gateway error:', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Response builder ──────────────────────────────────────────────────────
async function buildResponse(
  response: Response,
  isStream: boolean,
  cors: Record<string, string>
): Promise<Response> {
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    console.error('AI error:', response.status, errText.slice(0, 200))

    let errMsg = 'Serviço de IA indisponível. Tente novamente.'
    if (response.status === 402) errMsg = 'Créditos insuficientes. Verifique sua chave de API.'
    else if (response.status === 401) errMsg = 'Chave de API inválida.'
    else if (response.status === 429) errMsg = 'Limite atingido. Tente novamente em instantes.'

    return new Response(JSON.stringify({ error: errMsg }), {
      status: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (isStream) {
    return new Response(response.body, {
      headers: { ...cors, 'Content-Type': 'text/event-stream' },
    })
  }

  const data    = await response.json()
  const content = data?.choices?.[0]?.message?.content ?? ''
  const model   = data?.model ?? ''

  return new Response(JSON.stringify({ content, model, usage: data.usage }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
