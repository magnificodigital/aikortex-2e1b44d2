import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyCapabilityAddons } from "../_shared/agent-runtime.ts";
import { runAgentLLM } from "../_shared/agent-tools.ts";
import { callLLM } from "../_shared/llm-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── GET: Webhook verification ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token) {
      return new Response("Forbidden", { status: 403 });
    }

    const { data: verifyRows } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("provider", "whatsapp_verify_token")
      .eq("api_key", token)
      .limit(1);

    if (verifyRows && verifyRows.length > 0) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Incoming messages ──
  if (req.method === "POST") {
    try {
      const rawBody = await req.text();

      // Verify Meta HMAC signature. META_APP_SECRET DEVE estar configurado
      // em produção — fail-closed evita injeção de mensagens falsas.
      const appSecret = Deno.env.get("META_APP_SECRET");
      if (!appSecret) {
        console.error("META_APP_SECRET not configured — rejecting all webhook requests");
        return new Response("Forbidden", { status: 403 });
      }
      const sigHeader = req.headers.get("x-hub-signature-256") || "";
      const expected = sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : "";
      if (!expected) {
        return new Response("Forbidden", { status: 403 });
      }
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", enc.encode(appSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
      const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
      // constant-time compare
      if (computed.length !== expected.length) return new Response("Forbidden", { status: 403 });
      let diff = 0;
      for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
      if (diff !== 0) return new Response("Forbidden", { status: 403 });

      const body = JSON.parse(rawBody);
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return new Response(JSON.stringify({ status: "no_data" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (value.statuses) {
        console.log("Status update:", JSON.stringify(value.statuses));
        // Tenta correlacionar com cadence_executions via wamid armazenado em metadata.last_wamid
        for (const st of value.statuses) {
          const wamid = st.id;
          const newStatus = st.status; // sent | delivered | read | failed
          if (!wamid || !newStatus) continue;
          try {
            const { data: exec } = await supabase
              .from("cadence_executions")
              .select("id, metadata")
              .eq("metadata->>last_wamid", wamid)
              .maybeSingle();
            if (exec) {
              const prevMeta = (exec.metadata ?? {}) as Record<string, unknown>;
              const updates: Record<string, unknown> = {
                metadata: { ...prevMeta, whatsapp_last_status: newStatus, whatsapp_status_at: new Date().toISOString() },
              };
              // Se falhou no provedor, marca execution como failed
              if (newStatus === "failed") {
                const errMsg = st.errors?.[0]?.title || st.errors?.[0]?.message || "WhatsApp delivery failed";
                updates.status = "failed";
                updates.last_error = `WhatsApp: ${errMsg}`;
              }
              await supabase
                .from("cadence_executions")
                .update(updates)
                .eq("id", exec.id);
            }
            // Atualiza também whatsapp_messages se houver row com esse wamid
            await supabase
              .from("whatsapp_messages")
              .update({ status: newStatus })
              .eq("wamid", wamid);
          } catch (err) {
            console.error("status update error", err);
          }
        }
        return new Response(JSON.stringify({ status: "status_received" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages = value.messages;
      if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ status: "no_messages" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const phoneNumberId = value.metadata?.phone_number_id;

      // Find the user who owns this phone_number_id
      let ownerUserId: string | null = null;
      if (phoneNumberId) {
        const { data: ownerRows } = await supabase
          .from("user_api_keys")
          .select("user_id")
          .eq("provider", "whatsapp_phone_number_id")
          .eq("api_key", phoneNumberId)
          .limit(1);
        if (ownerRows && ownerRows.length > 0) {
          ownerUserId = ownerRows[0].user_id;
        }
      }

      const contactInfo = value.contacts?.[0];

      for (const message of messages) {
        const incomingData = {
          wamid: message.id,
          from_number: message.from,
          phone_number_id: phoneNumberId,
          contact_name: contactInfo?.profile?.name || message.from,
          message_type: message.type,
          content: extractContent(message),
          raw_payload: message,
          timestamp: message.timestamp
            ? new Date(parseInt(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          direction: "incoming",
          status: "received",
          user_id: ownerUserId,
        };

        const { error } = await supabase.from("whatsapp_messages").insert(incomingData);
        if (error) console.error("Error storing message:", error);
        console.log(`Received ${message.type} from ${message.from}: ${incomingData.content}`);

        // ── Auto-reply via Managed Session Agent ──
        if (ownerUserId && incomingData.content && message.type === "text") {
          handleAgentReply(supabase, ownerUserId, message.from, phoneNumberId, incomingData.content);
        }
      }

      return new Response(JSON.stringify({ status: "ok", count: messages.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Webhook error:", e);
      return new Response(JSON.stringify({ status: "error", message: String(e) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function callOpenRouterDirect(
  supabase: any,
  messages: Array<{ role: string; content: string }>,
  system: string,
): Promise<string | null> {
  const fullMessages = [{ role: "system", content: system }, ...messages];
  const result = await callLLM(fullMessages, { tier: "free", maxTokens: 1024 }, supabase);
  return result.success ? (result.content ?? null) : null;
}

/** Fire-and-forget: find agent config and call OpenRouter directly */
function handleAgentReply(
  supabase: any,
  ownerUserId: string,
  contactNumber: string,
  phoneNumberId: string | undefined,
  messageContent: string,
) {
  (async () => {
    try {
      console.log(`[auto-reply] start user=${ownerUserId} contact=${contactNumber}`);

      // Check if user has a WhatsApp agent configured
      const { data: agentConfig } = await supabase
        .from("user_api_keys")
        .select("api_key")
        .eq("provider", "whatsapp_agent_id")
        .eq("user_id", ownerUserId)
        .maybeSingle();

      if (!agentConfig?.api_key) {
        console.warn(`[auto-reply] skipped: no whatsapp_agent_id configured for user=${ownerUserId}`);
        return;
      }
      console.log(`[auto-reply] agentId=${agentConfig.api_key}`);

      // Fetch owner's WABA access token for sending replies
      const { data: wabaKeys } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", ownerUserId)
        .in("provider", ["whatsapp_access_token", "whatsapp_phone_number_id"]);

      const keyMap: Record<string, string> = {};
      (wabaKeys || []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });

      if (!keyMap.whatsapp_access_token) {
        console.error(`[auto-reply] skipped: no whatsapp_access_token for user=${ownerUserId}`);
        return;
      }

      const usedPhoneId = phoneNumberId || keyMap.whatsapp_phone_number_id;
      console.log(`[auto-reply] usedPhoneId=${usedPhoneId} hasToken=${!!keyMap.whatsapp_access_token}`);

      // Load agent config from user_agents (instructions/objective ficam dentro do JSON config)
      const { data: agent, error: agentErr } = await supabase
        .from("user_agents")
        .select("name, description, config")
        .eq("id", agentConfig.api_key)
        .maybeSingle();

      if (agentErr) console.error(`[auto-reply] agent fetch error:`, agentErr);
      if (!agent) {
        console.error(`[auto-reply] skipped: agent ${agentConfig.api_key} not found in user_agents`);
        return;
      }
      console.log(`[auto-reply] agent loaded: ${agent.name}`);

      // Extrai fields do config JSONB com fallbacks. Shape esperado vem do AgentBuilder
      // (businessContext + profile), mas tolera ausência.
      const cfg = (agent.config as any) ?? {};
      const ctx = cfg.businessContext ?? cfg.business_context ?? {};
      const profile = cfg.profile ?? {};

      const companyName = ctx.companyName || ctx.company_name || cfg.company_name || "";
      const toneOfVoice = ctx.toneOfVoice || ctx.tone_of_voice || profile.communicationStyle || cfg.tone_of_voice || "Profissional e amigável";
      const instructions = profile.instructions || cfg.instructions || "";
      const primaryGoal = profile.primaryGoal || cfg.objective || agent.description || "Atender e qualificar leads via WhatsApp.";

      const baseSystem = `Você é ${agent.name || "Assistente"}${companyName ? ` da ${companyName}` : ""}.
Objetivo: ${primaryGoal}
Tom: ${toneOfVoice}
${instructions ? `Instruções: ${instructions}\n` : ""}Responda sempre em português do Brasil. Seja natural e conversacional. Mensagens curtas (1-3 frases).`;
      const system = applyCapabilityAddons(baseSystem, cfg.capabilities);
      console.log(`[auto-reply] system prompt length=${system.length}`);

      console.log(`[auto-reply] calling LLM for agent=${agent.name}`);
      const replyText = await runAgentLLM({
        supabase,
        agentId: agentConfig.api_key,
        agencyId: null,
        system,
        messages: [{ role: "user", content: messageContent }],
        maxTokens: 1024,
      });

      if (!replyText) {
        console.error(`[auto-reply] LLM returned empty reply`);
        return;
      }
      console.log(`[auto-reply] LLM reply ready (${replyText.length} chars), sending...`);

      if (replyText && usedPhoneId) {
        // Send reply via WhatsApp Graph API directly (no auth needed, we have token)
        const graphResp = await fetch(
          `https://graph.facebook.com/v21.0/${usedPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${keyMap.whatsapp_access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: contactNumber,
              type: "text",
              text: { body: replyText },
            }),
          },
        );

        if (!graphResp.ok) {
          console.error("WhatsApp send error:", graphResp.status, await graphResp.text());
        } else {
          // Save outgoing message
          await supabase.from("whatsapp_messages").insert({
            from_number: usedPhoneId,
            to_number: contactNumber,
            content: replyText,
            message_type: "text",
            direction: "outgoing",
            status: "sent",
            phone_number_id: usedPhoneId,
            user_id: ownerUserId,
          });
          console.log(`Agent replied to ${contactNumber}: ${replyText.substring(0, 80)}...`);
        }
      }
    } catch (err) {
      console.error("handleAgentReply error:", err);
    }
  })();
}

function extractContent(message: any): string {
  switch (message.type) {
    case "text": return message.text?.body || "";
    case "image": return message.image?.caption || "[Imagem]";
    case "video": return message.video?.caption || "[Vídeo]";
    case "audio": return "[Áudio]";
    case "document": return message.document?.filename || "[Documento]";
    case "location": return `[Localização: ${message.location?.latitude}, ${message.location?.longitude}]`;
    case "contacts": return `[Contato: ${message.contacts?.[0]?.name?.formatted_name || ""}]`;
    case "sticker": return "[Sticker]";
    case "reaction": return `[Reação: ${message.reaction?.emoji || ""}]`;
    case "interactive":
      if (message.interactive?.type === "button_reply") return message.interactive.button_reply?.title || "[Botão]";
      if (message.interactive?.type === "list_reply") return message.interactive.list_reply?.title || "[Lista]";
      return "[Interativo]";
    case "button": return message.button?.text || "[Botão]";
    case "order": return "[Pedido]";
    default: return `[${message.type}]`;
  }
}
