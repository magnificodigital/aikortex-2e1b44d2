// facebook-webhook
// ================
// Messenger da Pagina (object=page). Mesmo pattern do instagram-webhook:
// HMAC fail-closed, camada canonica do inbox, auto-reply respeitando
// human takeover. Owner resolvido por facebook_page_id (conexao propria do Facebook).
// MESMA conexao Meta do Instagram — um login habilita os dois canais).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyCapabilityAddons } from "../_shared/agent-runtime.ts";
import { runAgentLLM } from "../_shared/agent-tools.ts";
import { recordInboxMessage } from "../_shared/inbox.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    // Token FIXO de plataforma (mesmo secret do Instagram webhook).
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");
    if (mode === "subscribe" && expected && token === expected) {
      return new Response(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const rawBody = await req.text();
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) return new Response("Forbidden", { status: 403 });
    const sigHeader = req.headers.get("x-hub-signature-256") || "";
    const expected = sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : "";
    if (!expected) return new Response("Forbidden", { status: 403 });
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (computed.length !== expected.length) return new Response("Forbidden", { status: 403 });
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return new Response("Forbidden", { status: 403 });

    const body = JSON.parse(rawBody);
    if (body.object !== "page") {
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const entry of body.entry ?? []) {
      const pageId = String(entry.id ?? "");
      const { data: ownerRows } = await supabase
        .from("user_api_keys").select("user_id")
        .eq("provider", "facebook_page_id").eq("api_key", pageId).limit(1);
      const ownerUserId: string | null = ownerRows?.[0]?.user_id ?? null;

      for (const event of entry.messaging ?? []) {
        const msg = event.message;
        if (!msg || msg.is_echo) continue;
        const senderId = String(event.sender?.id ?? "");
        if (!senderId || senderId === pageId) continue;
        const content = msg.text
          || (msg.attachments?.length ? `[${msg.attachments[0]?.type || "mídia"}]` : "");
        if (!content) continue;

        let aiEnabled = true;
        if (ownerUserId) {
          const inboxRes = await recordInboxMessage({
            supabase,
            ownerUserId,
            channel: "facebook",
            direction: "inbound",
            contactPhone: senderId, // PSID como identidade
            contactName: null,
            content,
            contentType: msg.text ? "text" : "image",
            externalId: msg.mid ?? null,
          });
          aiEnabled = inboxRes.aiEnabled;
        }
        if (ownerUserId && msg.text && aiEnabled) {
          handleAgentReply(supabase, ownerUserId, senderId, content);
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[fb-webhook] error:", e);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function handleAgentReply(supabase: any, ownerUserId: string, recipientId: string, messageContent: string) {
  (async () => {
    try {
      const { data: keys } = await supabase
        .from("user_api_keys").select("provider, api_key")
        .eq("user_id", ownerUserId)
        .in("provider", ["instagram_agent_id", "whatsapp_agent_id", "facebook_page_token"]);
      const keyMap: Record<string, string> = {};
      (keys || []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });
      const agentId = keyMap.instagram_agent_id || keyMap.whatsapp_agent_id;
      const accessToken = keyMap.facebook_page_token;
      if (!agentId || !accessToken) return;

      const { data: agent } = await supabase
        .from("user_agents").select("name, description, config")
        .eq("id", agentId).maybeSingle();
      if (!agent) return;

      const cfg = (agent.config as any) ?? {};
      const ctx = cfg.businessContext ?? {};
      const profile = cfg.profile ?? {};
      const baseSystem = `Você é ${agent.name || "Assistente"}${ctx.companyName ? ` da ${ctx.companyName}` : ""}.
Objetivo: ${profile.primaryGoal || cfg.objective || agent.description || "Atender clientes via Messenger."}
Tom: ${ctx.toneOfVoice || "Profissional e amigável"}
${profile.instructions ? `Instruções: ${profile.instructions}\n` : ""}Responda em português do Brasil. Mensagens curtas (1-3 frases).`;
      const system = applyCapabilityAddons(baseSystem, cfg.capabilities);

      const replyText = await runAgentLLM({
        supabase, agentId, agencyId: null, system,
        messages: [{ role: "user", content: messageContent }],
        maxTokens: 1024,
      });
      if (!replyText) return;

      const resp = await fetch(`${GRAPH_API}/me/messages?access_token=${accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text: replyText } }),
      });
      if (!resp.ok) {
        console.error("[fb-auto-reply] send error:", resp.status, await resp.text());
        return;
      }
      await recordInboxMessage({
        supabase, ownerUserId, channel: "facebook", direction: "outbound",
        contactPhone: recipientId, content: replyText,
      });
    } catch (err) {
      console.error("[fb-auto-reply] error:", err);
    }
  })();
}
