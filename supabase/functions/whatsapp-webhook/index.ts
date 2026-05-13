import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyCapabilityAddons } from "../_shared/agent-runtime.ts";
import { runAgentLLM } from "../_shared/agent-tools.ts";

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

      // Verify Meta HMAC signature when META_APP_SECRET is configured
      const appSecret = Deno.env.get("META_APP_SECRET");
      if (appSecret) {
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
      } else {
        console.warn("META_APP_SECRET not configured — webhook signature not verified");
      }

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
      // Check if user has a WhatsApp agent configured
      const { data: agentConfig } = await supabase
        .from("user_api_keys")
        .select("api_key")
        .eq("provider", "whatsapp_agent_id")
        .eq("user_id", ownerUserId)
        .maybeSingle();

      if (!agentConfig?.api_key) return;

      // Fetch owner's WABA access token for sending replies
      const { data: wabaKeys } = await supabase
        .from("user_api_keys")
        .select("provider, api_key")
        .eq("user_id", ownerUserId)
        .in("provider", ["whatsapp_access_token", "whatsapp_phone_number_id"]);

      const keyMap: Record<string, string> = {};
      (wabaKeys || []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });

      if (!keyMap.whatsapp_access_token) return;

      const usedPhoneId = phoneNumberId || keyMap.whatsapp_phone_number_id;

      // Load agent config from user_agents table
      const { data: agent } = await supabase
        .from("user_agents")
        .select("name, role, objective, instructions, tone_of_voice, company_name, config")
        .eq("id", agentConfig.api_key)
        .maybeSingle();

      if (!agent) return;

      const baseSystem = `Você é ${agent.name || "Assistente"}${agent.company_name ? ` da ${agent.company_name}` : ""}.
Objetivo: ${agent.objective || "Atender e qualificar leads via WhatsApp."}
Tom: ${agent.tone_of_voice || "Profissional e Amigável"}
Instruções: ${agent.instructions || ""}
Responda sempre em português do Brasil. Seja natural e conversacional.`;
      const system = applyCapabilityAddons(baseSystem, (agent.config as any)?.capabilities);

      const replyText = await runAgentLLM({
        supabase,
        agentId: agentConfig.api_key,
        agencyId: null,
        system,
        messages: [{ role: "user", content: messageContent }],
        maxTokens: 1024,
      });

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
