import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_HEADERS = (apiKey: string) => ({
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "managed-agents-2026-04-01",
  "Content-Type": "application/json",
});

function buildAgentSystemPrompt(config: Record<string, unknown>): string {
  const name = typeof config.name === "string" ? config.name : "Agente";
  const sections = [
    `Você é o agente "${name}".`,
    config.description ? `Descrição: ${config.description}` : null,
    config.objective ? `Objetivo: ${config.objective}` : null,
    config.instructions ? `Instruções: ${config.instructions}` : null,
    config.toneOfVoice ? `Tom de voz: ${config.toneOfVoice}` : null,
    config.greetingMessage ? `Saudação: ${config.greetingMessage}` : null,
    config.memory ? `Memória: ${config.memory}` : null,
    "Responda sempre em português brasileiro.",
  ].filter(Boolean);
  return sections.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent_db_id, message, contact_identifier, channel, owner_user_id } = await req.json();

    if (!agent_db_id || !message) {
      return new Response(JSON.stringify({ error: "agent_db_id e message são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey);

    // ── Determine effective user: either from JWT or from owner_user_id (webhook mode) ──
    const isWhatsAppMode = channel === "whatsapp" && !!owner_user_id;
    let userId: string;
    let isPlatformUser = false;

    if (isWhatsAppMode) {
      userId = owner_user_id;
      const { data: profileData } = await adminClient
        .from("profiles").select("role").eq("user_id", userId).single();
      isPlatformUser = ["platform_owner", "platform_admin"].includes(profileData?.role);
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;

      const { data: profileData } = await supabase
        .from("profiles").select("role").eq("user_id", userId).single();
      isPlatformUser = ["platform_owner", "platform_admin"].includes(profileData?.role);
    }

    // ══════════════════════════════════════════════════════════
    // RULE 3 — Managed Agents ONLY with user's own Anthropic BYOK key
    // Never use platform ANTHROPIC_API_KEY for managed sessions
    // ══════════════════════════════════════════════════════════
    const { data: userAnthropicKey } = await adminClient
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", "anthropic")
      .maybeSingle();

    const anthropicApiKey = userAnthropicKey?.api_key || null;

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({
        error: "Agentes Gerenciados requerem sua própria chave Anthropic (BYOK). Configure em Configurações → Integrações.",
        code: "BYOK_REQUIRED",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Usage check: (1) platform → pass, (2) BYOK → pass (they have anthropic key), (3) check monthly limit
    if (!isPlatformUser) {
      const { data: byokKeys } = await adminClient
        .from("user_api_keys")
        .select("provider")
        .eq("user_id", userId)
        .in("provider", ["openai", "anthropic", "gemini", "openrouter"])
        .limit(1);
      const hasByok = (byokKeys?.length ?? 0) > 0;

      if (!hasByok) {
        const yearMonth = new Date().toISOString().slice(0, 7);

        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("plan_id, plans(slug)")
          .eq("user_id", userId)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        const planSlug = (sub?.plans as any)?.slug || "starter";

        const { data: limitData } = await adminClient
          .from("plan_message_limits")
          .select("monthly_limit")
          .eq("plan_slug", planSlug)
          .maybeSingle();

        const monthlyLimit = limitData?.monthly_limit ?? 500;

        if (monthlyLimit !== -1) {
          const { data: usageData } = await adminClient
            .from("monthly_usage")
            .select("message_count")
            .eq("user_id", userId)
            .eq("year_month", yearMonth)
            .maybeSingle();

          const currentCount = usageData?.message_count || 0;

          if (currentCount >= monthlyLimit) {
            if (isWhatsAppMode) {
              return new Response(JSON.stringify({ reply: null, reason: "monthly_limit_reached" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            return new Response(
              JSON.stringify({ error: `Limite mensal de ${monthlyLimit} mensagens atingido. Configure uma chave de API própria ou faça upgrade.` }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Fetch agent (use adminClient so webhook mode works too)
    const { data: agent, error: agentError } = await adminClient
      .from("user_agents")
      .select("*")
      .eq("id", agent_db_id)
      .eq("user_id", userId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agente não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure agent has anthropic_agent_id
    let anthropicAgentId = agent.anthropic_agent_id;
    if (!anthropicAgentId) {
      console.log("Agent missing anthropic_agent_id, syncing definition...");
      const config = typeof agent.config === "object" && agent.config ? agent.config as Record<string, unknown> : {};
      const systemPrompt = buildAgentSystemPrompt({ name: agent.name, ...config });
      const agentModel = agent.model || "claude-sonnet-4-6";

      const createResp = await fetch(`${ANTHROPIC_BASE}/agents`, {
        method: "POST",
        headers: ANTHROPIC_HEADERS(anthropicApiKey),
        body: JSON.stringify({
          model: agentModel.startsWith("claude-") ? agentModel : "claude-sonnet-4-6",
          system_prompt: systemPrompt,
          tools: [],
        }),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error("Failed to create Anthropic agent:", createResp.status, errText);
        return new Response(JSON.stringify({ error: "Erro ao registrar agente na Anthropic." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const agentDef = await createResp.json();
      anthropicAgentId = agentDef.id;

      await adminClient
        .from("user_agents")
        .update({ anthropic_agent_id: anthropicAgentId, anthropic_agent_version: agentDef.version || 1 })
        .eq("id", agent_db_id);
    }

    // Find or create session
    const contactId = contact_identifier || userId;
    const sessionChannel = channel || "chat";

    const { data: existingSession } = await adminClient
      .from("agent_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("agent_id", agent_db_id)
      .eq("contact_identifier", contactId)
      .eq("channel", sessionChannel)
      .in("status", ["idle", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let anthropicSessionId = existingSession?.anthropic_session_id;

    if (!anthropicSessionId) {
      const envResp = await fetch(`${ANTHROPIC_BASE}/environments`, {
        method: "POST",
        headers: ANTHROPIC_HEADERS(anthropicApiKey),
        body: JSON.stringify({}),
      });

      if (!envResp.ok) {
        const errText = await envResp.text();
        console.error("Failed to create environment:", envResp.status, errText);
        return new Response(JSON.stringify({ error: "Erro ao criar ambiente de sessão." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const env = await envResp.json();

      const { data: memoryStore } = await adminClient
        .from("agent_memory_stores")
        .select("anthropic_memory_store_id")
        .eq("agent_id", agent_db_id)
        .maybeSingle();

      const sessionBody: Record<string, unknown> = {
        agent_id: anthropicAgentId,
        environment_id: env.id,
      };

      if (memoryStore?.anthropic_memory_store_id) {
        sessionBody.memory_store_ids = [memoryStore.anthropic_memory_store_id];
      }

      const sessionResp = await fetch(`${ANTHROPIC_BASE}/sessions`, {
        method: "POST",
        headers: ANTHROPIC_HEADERS(anthropicApiKey),
        body: JSON.stringify(sessionBody),
      });

      if (!sessionResp.ok) {
        const errText = await sessionResp.text();
        console.error("Failed to create session:", sessionResp.status, errText);
        return new Response(JSON.stringify({ error: "Erro ao criar sessão do agente." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await sessionResp.json();
      anthropicSessionId = session.id;

      if (existingSession) {
        await adminClient
          .from("agent_sessions")
          .update({ anthropic_session_id: anthropicSessionId, status: "running" })
          .eq("id", existingSession.id);
      } else {
        await adminClient.from("agent_sessions").insert({
          user_id: userId,
          agent_id: agent_db_id,
          anthropic_session_id: anthropicSessionId,
          contact_identifier: contactId,
          channel: sessionChannel,
          status: "running",
        });
      }
    }

    // Send message
    const eventResp = await fetch(`${ANTHROPIC_BASE}/sessions/${anthropicSessionId}/events`, {
      method: "POST",
      headers: ANTHROPIC_HEADERS(anthropicApiKey),
      body: JSON.stringify({
        events: [{ type: "user.message", content: [{ type: "text", text: message }] }],
      }),
    });

    if (!eventResp.ok) {
      const errText = await eventResp.text();
      console.error("Failed to send event:", eventResp.status, errText);

      if (eventResp.status === 404 || eventResp.status === 410) {
        await adminClient
          .from("agent_sessions")
          .update({ status: "terminated" })
          .eq("anthropic_session_id", anthropicSessionId);
      }

      return new Response(JSON.stringify({ error: "Erro ao enviar mensagem para o agente." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get response stream
    const streamResp = await fetch(`${ANTHROPIC_BASE}/sessions/${anthropicSessionId}/events/stream`, {
      method: "GET",
      headers: { ...ANTHROPIC_HEADERS(anthropicApiKey), Accept: "text/event-stream" },
    });

    if (!streamResp.ok || !streamResp.body) {
      const errText = await streamResp.text();
      console.error("Failed to stream:", streamResp.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao receber resposta do agente." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WhatsApp mode: collect full response, return JSON ──
    if (isWhatsAppMode) {
      return await handleWhatsAppResponse(
        streamResp, anthropicSessionId!, adminClient, userId, isPlatformUser, agent,
      );
    }

    // ── Chat mode: stream SSE to client ──
    return handleStreamResponse(
      streamResp, anthropicSessionId!, adminClient, userId, isPlatformUser, agent,
    );
  } catch (e) {
    console.error("managed-session-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Collect full text from stream and return { reply } for WhatsApp */
async function handleWhatsAppResponse(
  streamResp: Response,
  anthropicSessionId: string,
  adminClient: any,
  userId: string,
  isPlatformUser: boolean,
  agent: any,
): Promise<Response> {
  const reader = streamResp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.usage) {
            inputTokens = parsed.usage.input_tokens || inputTokens;
            outputTokens = parsed.usage.output_tokens || outputTokens;
          }
          if (parsed.type === "message_start" && parsed.message?.usage) {
            inputTokens = parsed.message.usage.input_tokens || inputTokens;
          }
          if (parsed.type === "message_delta" && parsed.usage) {
            outputTokens = parsed.usage.output_tokens || outputTokens;
          }
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            fullText += parsed.delta.text || "";
          }
          if (parsed.type === "assistant.message" && Array.isArray(parsed.content)) {
            for (const block of parsed.content) {
              if (block.type === "text") fullText += block.text || "";
            }
          }
        } catch { /* ignore non-JSON */ }
      }
    }
  } catch (e) {
    console.error("WhatsApp stream read error:", e);
  }

  await finalizeSession(adminClient, anthropicSessionId, userId, isPlatformUser, agent, inputTokens, outputTokens);

  return new Response(JSON.stringify({ reply: fullText || null }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Stream SSE to chat client */
function handleStreamResponse(
  streamResp: Response,
  anthropicSessionId: string,
  adminClient: any,
  userId: string,
  isPlatformUser: boolean,
  agent: any,
): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = streamResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            await writer.write(encoder.encode("data: [DONE]\n\n"));
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.usage) {
              inputTokens = parsed.usage.input_tokens || inputTokens;
              outputTokens = parsed.usage.output_tokens || outputTokens;
            }
            if (parsed.type === "message_start" && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens || inputTokens;
            }
            if (parsed.type === "message_delta" && parsed.usage) {
              outputTokens = parsed.usage.output_tokens || outputTokens;
            }

            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const text = parsed.delta.text || "";
              const oaiChunk = { choices: [{ delta: { content: text }, index: 0 }] };
              await writer.write(encoder.encode(`data: ${JSON.stringify(oaiChunk)}\n\n`));
            }

            if (parsed.type === "assistant.message" && Array.isArray(parsed.content)) {
              for (const block of parsed.content) {
                if (block.type === "text") {
                  const oaiChunk = { choices: [{ delta: { content: block.text || "" }, index: 0 }] };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(oaiChunk)}\n\n`));
                }
              }
            }
          } catch { /* ignore */ }
        }
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("Stream processing error:", e);
    } finally {
      writer.close();
      await finalizeSession(adminClient, anthropicSessionId, userId, isPlatformUser, agent, inputTokens, outputTokens);
    }
  })();

  return new Response(readable, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

/** Update session status and debit credits */
async function finalizeSession(
  adminClient: any,
  anthropicSessionId: string,
  userId: string,
  isPlatformUser: boolean,
  agent: any,
  inputTokens: number,
  outputTokens: number,
) {
  await adminClient
    .from("agent_sessions")
    .update({ last_message_at: new Date().toISOString(), status: "idle" })
    .eq("anthropic_session_id", anthropicSessionId);

  if (!isPlatformUser) {
    const yearMonth = new Date().toISOString().slice(0, 7);
    adminClient.rpc("increment_monthly_usage", {
      p_user_id: userId,
      p_year_month: yearMonth,
    }).catch((e: unknown) => console.error("Error tracking usage:", e));
  }
}
