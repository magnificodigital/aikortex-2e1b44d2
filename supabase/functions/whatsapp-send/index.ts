import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's WABA credentials from user_api_keys
    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", user.id)
      .in("provider", ["whatsapp_access_token", "whatsapp_phone_number_id"]);

    const keyMap: Record<string, string> = {};
    (keys || []).forEach((k: any) => { keyMap[k.provider] = k.api_key; });

    const WHATSAPP_TOKEN = keyMap.whatsapp_access_token;
    const PHONE_NUMBER_ID = keyMap.whatsapp_phone_number_id;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "Configure suas credenciais WABA em Configurações → Canais → WhatsApp" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, type = "text", message, template, interactive, media } = body;

    if (!to) {
      return new Response(JSON.stringify({ error: "Campo 'to' é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
    };

    switch (type) {
      case "text":
        payload.type = "text";
        payload.text = { preview_url: false, body: message || "" };
        break;
      case "template":
        payload.type = "template";
        payload.template = {
          name: template?.name || "hello_world",
          language: { code: template?.language || "pt_BR" },
          ...(template?.components && { components: template.components }),
        };
        break;
      case "interactive_buttons":
        payload.type = "interactive";
        payload.interactive = {
          type: "button",
          body: { text: interactive?.body || message || "" },
          action: {
            buttons: (interactive?.buttons || []).slice(0, 3).map((btn: any, i: number) => ({
              type: "reply",
              reply: { id: btn.id || `btn_${i}`, title: (btn.title || btn.text || `Opção ${i + 1}`).slice(0, 20) },
            })),
          },
        };
        if (interactive?.header) payload.interactive.header = { type: "text", text: interactive.header };
        if (interactive?.footer) payload.interactive.footer = { text: interactive.footer };
        break;
      case "interactive_list":
        payload.type = "interactive";
        payload.interactive = {
          type: "list",
          body: { text: interactive?.body || message || "" },
          action: {
            button: (interactive?.button_text || "Ver opções").slice(0, 20),
            sections: interactive?.sections || [{ title: "Opções", rows: [{ id: "opt_1", title: "Opção 1" }] }],
          },
        };
        if (interactive?.header) payload.interactive.header = { type: "text", text: interactive.header };
        if (interactive?.footer) payload.interactive.footer = { text: interactive.footer };
        break;
      case "image":
        payload.type = "image";
        payload.image = { link: media?.url || media?.link, caption: media?.caption || "" };
        break;
      case "document":
        payload.type = "document";
        payload.document = { link: media?.url || media?.link, caption: media?.caption || "", filename: media?.filename || "document" };
        break;
      case "video":
        payload.type = "video";
        payload.video = { link: media?.url || media?.link, caption: media?.caption || "" };
        break;
      case "audio":
        payload.type = "audio";
        payload.audio = { link: media?.url || media?.link };
        break;
      case "location":
        payload.type = "location";
        payload.location = { longitude: media?.longitude, latitude: media?.latitude, name: media?.name || "", address: media?.address || "" };
        break;
      case "reaction":
        payload.type = "reaction";
        payload.reaction = { message_id: media?.message_id, emoji: media?.emoji || "👍" };
        break;
      default:
        payload.type = "text";
        payload.text = { body: message || "" };
    }

    const response = await fetch(`${GRAPH_API}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Falha ao enviar mensagem", details: data.error?.message || JSON.stringify(data) }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store sent message
    try {
      await supabase.from("whatsapp_messages").insert({
        wamid: data.messages?.[0]?.id || null,
        from_number: PHONE_NUMBER_ID,
        phone_number_id: PHONE_NUMBER_ID,
        to_number: to,
        message_type: type,
        content: message || template?.name || "[mídia]",
        raw_payload: payload,
        direction: "outgoing",
        status: "sent",
        user_id: user.id,
      });
    } catch (dbErr) {
      console.error("Error storing sent message:", dbErr);
    }

    return new Response(JSON.stringify({ success: true, message_id: data.messages?.[0]?.id, data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Send error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
