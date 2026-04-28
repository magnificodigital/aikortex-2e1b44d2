import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";
const BATCH_SIZE = 10;
const MESSAGE_DELAY_MS = 100;

interface Contact {
  phone: string;
  name?: string;
  [key: string]: unknown;
}

function interpolateTemplate(template: string, contact: Contact): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(contact[key] ?? ""));
}

async function personalizeWithAgent(
  supabase: any,
  agentDbId: string,
  contact: Contact,
  template: string,
  userId: string,
): Promise<string | null> {
  try {
    const interpolated = interpolateTemplate(template, contact);
    const resp = await supabase.functions.invoke("managed-session-chat", {
      body: {
        agent_db_id: agentDbId,
        message: `Personalize esta mensagem para ${contact.name || contact.phone}: ${interpolated}. Responda APENAS com a mensagem personalizada, sem explicações.`,
        contact_identifier: `broadcast_${contact.phone}`,
        channel: "whatsapp",
        owner_user_id: userId,
      },
    });
    return resp.data?.reply || null;
  } catch (err) {
    console.error(`AI personalization failed for ${contact.phone}:`, err);
    return null;
  }
}

async function sendWhatsApp(
  waToken: string,
  phoneNumberId: string,
  to: string,
  message: string,
): Promise<{ ok: boolean; wamid?: string; error?: string }> {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: message },
  };

  const resp = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${waToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (resp.ok) {
    return { ok: true, wamid: data.messages?.[0]?.id };
  }
  return { ok: false, error: data.error?.message || "Unknown error" };
}

async function processBroadcast(
  supabase: any,
  logId: string,
  userId: string,
  contacts: Contact[],
  template: string,
  useAI: boolean,
  agentDbId: string | null,
  waToken: string,
  phoneNumberId: string,
) {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (contact) => {
      try {
        let finalMessage = interpolateTemplate(template, contact);

        if (useAI && agentDbId) {
          const personalized = await personalizeWithAgent(supabase, agentDbId, contact, template, userId);
          if (personalized) finalMessage = personalized;
        }

        const result = await sendWhatsApp(waToken, phoneNumberId, contact.phone, finalMessage);

        if (result.ok) {
          sent++;
          await supabase.from("whatsapp_messages").insert({
            wamid: result.wamid || null,
            from_number: phoneNumberId,
            phone_number_id: phoneNumberId,
            to_number: contact.phone,
            message_type: "text",
            content: finalMessage,
            direction: "outgoing",
            status: "sent",
            user_id: userId,
          }).catch(() => {});
        } else {
          failed++;
          console.error(`Send failed to ${contact.phone}:`, result.error);
        }

        // Rate limit delay
        await new Promise((r) => setTimeout(r, MESSAGE_DELAY_MS));
      } catch (err) {
        failed++;
        console.error(`Error processing ${contact.phone}:`, err);
      }
    });

    await Promise.all(promises);

    // Update progress
    await supabase.from("broadcast_logs").update({ sent, failed }).eq("id", logId);

    // Delay between batches
    if (i + BATCH_SIZE < contacts.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Increment monthly usage
  const yearMonth = new Date().toISOString().slice(0, 7);
  const totalMsgs = useAI ? (sent * 2) : sent;
  for (let m = 0; m < totalMsgs; m++) {
    await supabase.rpc("increment_monthly_usage", { p_user_id: userId, p_year_month: yearMonth });
  }

  // Final update
  await supabase.from("broadcast_logs").update({
    sent,
    failed,
    status: failed === contacts.length ? "failed" : "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", logId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      contacts,
      message_template,
      use_ai = false,
      agent_db_id = null,
      phone_number_id,
      broadcast_name,
    } = body;

    if (!contacts?.length || !message_template) {
      return new Response(JSON.stringify({ error: "contacts e message_template são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get WhatsApp credentials
    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", user.id)
      .in("provider", ["whatsapp_access_token", "whatsapp_phone_number_id"]);

    const keyMap: Record<string, string> = {};
    (keys || []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });

    const waToken = keyMap.whatsapp_access_token;
    const waPhoneId = phone_number_id || keyMap.whatsapp_phone_number_id;

    if (!waToken || !waPhoneId) {
      return new Response(JSON.stringify({ error: "Configure suas credenciais WABA em Configurações → Canais → WhatsApp" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check monthly usage
    const yearMonth = new Date().toISOString().slice(0, 7);
    const estimatedMsgs = use_ai ? contacts.length * 2 : contacts.length;

    const [usageRes, subRes, byokRes] = await Promise.all([
      supabase.from("monthly_usage").select("message_count").eq("user_id", user.id).eq("year_month", yearMonth).maybeSingle(),
      supabase.from("subscriptions").select("plan_id, plans(slug)").eq("user_id", user.id).in("status", ["active", "trialing"]).maybeSingle(),
      supabase.from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ["openai", "anthropic", "gemini", "openrouter"]),
    ]);

    const hasByok = (byokRes.data?.length ?? 0) > 0;
    const planSlug = (subRes.data?.plans as any)?.slug || "starter";
    const currentUsage = usageRes.data?.message_count ?? 0;

    if (!hasByok) {
      const { data: limitData } = await supabase.from("plan_message_limits").select("monthly_limit").eq("plan_slug", planSlug).maybeSingle();
      const monthlyLimit = limitData?.monthly_limit ?? 500;
      if (monthlyLimit !== -1 && (currentUsage + estimatedMsgs) > monthlyLimit) {
        return new Response(JSON.stringify({
          error: "Limite mensal de mensagens insuficiente",
          current: currentUsage,
          estimated: estimatedMsgs,
          limit: monthlyLimit,
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create broadcast log
    const { data: logRow } = await supabase.from("broadcast_logs").insert({
      user_id: user.id,
      broadcast_name: broadcast_name || `Disparo ${new Date().toLocaleDateString("pt-BR")}`,
      total_contacts: contacts.length,
      use_ai,
      agent_id: agent_db_id || null,
      channel: "whatsapp",
      status: "running",
    }).select("id").single();

    const logId = logRow?.id;

    // Process async
    EdgeRuntime.waitUntil(
      processBroadcast(supabase, logId, user.id, contacts, message_template, use_ai, agent_db_id, waToken, waPhoneId)
    );

    return new Response(JSON.stringify({
      success: true,
      broadcast_id: logId,
      status: "running",
      total: contacts.length,
      estimated_messages: estimatedMsgs,
    }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Broadcast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
