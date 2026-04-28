import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Reject internal/private hostnames and non-https URLs to prevent SSRF.
function isSafeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^::1$/.test(hostname) ||
      /^fc[0-9a-f]{2}:/i.test(hostname) ||
      /^fe80:/i.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();
    const event = body.data?.event_type;
    const payload = body.data?.payload;
    const callControlId = payload?.call_control_id;
    const clientState = payload?.client_state
      ? JSON.parse(atob(payload.client_state))
      : null;

    switch (event) {
      case "call.initiated": {
        if (clientState?.agent_id) {
          // Outbound call — just answer
          await telnyxAction(callControlId, "answer", {}, clientState.user_id);
        } else {
          // Inbound call — find agent by phone number
          const toNumber = payload?.to;
          const { data: agent } = await supabase
            .from("user_agents")
            .select("*")
            .eq("telnyx_phone_number", toNumber)
            .single();

          if (!agent) {
            await telnyxAction(callControlId, "hangup", {}, null);
            break;
          }

          await telnyxAction(callControlId, "answer", {}, agent.user_id);

          await supabase.from("call_logs").insert({
            user_id: agent.user_id,
            agent_id: agent.id,
            direction: "inbound",
            channel: "phone",
            phone_from: payload?.from,
            phone_to: toNumber,
            status: "in_progress",
            telnyx_call_id: callControlId,
          });

          await (supabase.from("call_sessions") as any).upsert({
            call_control_id: callControlId,
            agent_id: agent.id,
            user_id: agent.user_id,
            messages: [],
            created_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "call.answered": {
        const agentId = clientState?.agent_id;
        const userId = clientState?.user_id;
        if (!agentId) break;

        const { data: agent } = await supabase
          .from("user_agents")
          .select("*")
          .eq("id", agentId)
          .single();

        if (!agent) break;

        await (supabase.from("call_sessions") as any).upsert({
          call_control_id: callControlId,
          agent_id: agent.id,
          user_id: userId,
          messages: [],
          created_at: new Date().toISOString(),
        });

        // Speak opening message if agent speaks first
        const config = (agent.config ?? {}) as Record<string, any>;
        if (config.who_speaks_first === "agent" && config.opening_message) {
          const audioUrl = await generateTTS(
            config.opening_message,
            userId,
            agent.voice_id,
            agent.voice_stability,
            config.voice_speed
          );
          if (audioUrl) {
            await telnyxAction(callControlId, "playback_start", {
              audio_url: audioUrl,
              loop: false,
            }, userId);
          }
        }

        // Start transcription
        const keywordBoost = config.keyword_boost
          ? config.keyword_boost.split(",").map((k: string) => k.trim())
          : [];

        await telnyxAction(callControlId, "transcription_start", {
          language: agent.voice_language ?? "pt-BR",
          transcription_engine: "A",
          ...(keywordBoost.length > 0 ? { keywords: keywordBoost } : {}),
        }, userId);

        // Update log
        await supabase
          .from("call_logs")
          .update({ status: "in_progress" })
          .eq("telnyx_call_id", callControlId);

        break;
      }

      case "call.transcription": {
        const transcript = payload?.transcription_data?.transcript;
        if (!transcript) break;

        const { data: session } = await (supabase.from("call_sessions") as any)
          .select("*")
          .eq("call_control_id", callControlId)
          .single();

        if (!session) break;

        const { data: agent } = await supabase
          .from("user_agents")
          .select("*")
          .eq("id", session.agent_id)
          .single();

        if (!agent) break;

        const config = (agent.config ?? {}) as Record<string, any>;

        // Check hangup keywords
        const hangupKeywords = config.action_hangup_keywords
          ? config.action_hangup_keywords.split(",").map((k: string) => k.trim().toLowerCase())
          : [];
        if (hangupKeywords.some((kw: string) => transcript.toLowerCase().includes(kw))) {
          await telnyxAction(callControlId, "hangup", {}, session.user_id);
          break;
        }

        // Check transfer
        if (config.action_transfer_number && transcript.toLowerCase().includes("falar com humano")) {
          await telnyxAction(callControlId, "transfer", {
            to: config.action_transfer_number,
          }, session.user_id);
          break;
        }

        // Add user message to session
        const messages = [...(session.messages ?? []), { role: "user", content: transcript }];
        await (supabase.from("call_sessions") as any)
          .update({ messages })
          .eq("call_control_id", callControlId);

        // Get AI response
        const aiResponse = await getAgentLLMResponse(agent, messages, session.user_id);
        if (!aiResponse) break;

        // Update session with assistant response
        const updatedMessages = [...messages, { role: "assistant", content: aiResponse }];
        await (supabase.from("call_sessions") as any)
          .update({ messages: updatedMessages })
          .eq("call_control_id", callControlId);

        // Generate TTS and play
        const audioUrl = await generateTTS(
          aiResponse,
          session.user_id,
          agent.voice_id,
          agent.voice_stability,
          config.voice_speed
        );

        if (audioUrl) {
          await telnyxAction(callControlId, "playback_start", {
            audio_url: audioUrl,
            loop: false,
          }, session.user_id);
        }

        break;
      }

      case "call.hangup": {
        const { data: session } = await (supabase.from("call_sessions") as any)
          .select("*")
          .eq("call_control_id", callControlId)
          .single();

        const duration =
          payload?.end_time && payload?.start_time
            ? Math.floor(
                (new Date(payload.end_time).getTime() -
                  new Date(payload.start_time).getTime()) /
                  1000
              )
            : 0;

        // Update call log
        await supabase
          .from("call_logs")
          .update({
            status: "completed",
            duration_seconds: duration,
            ended_at: new Date().toISOString(),
            transcript: session?.messages ?? [],
          })
          .eq("telnyx_call_id", callControlId);

        // Post-call actions
        if (session?.agent_id) {
          const { data: agent } = await supabase
            .from("user_agents")
            .select("config, telnyx_phone_number")
            .eq("id", session.agent_id)
            .single();

          const agentConfig = (agent?.config ?? {}) as Record<string, any>;

          // Send post-call SMS
          if (agentConfig.action_post_sms && payload?.from && agent?.telnyx_phone_number) {
            await sendSMS(
              agent.telnyx_phone_number,
              payload.from,
              agentConfig.action_post_sms,
              session.user_id
            );
          }

          // Call post-call webhook (with SSRF protection)
          if (agentConfig.action_webhook_url && isSafeWebhookUrl(agentConfig.action_webhook_url)) {
            try {
              await fetch(agentConfig.action_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  call_control_id: callControlId,
                  duration,
                  transcript: session?.messages ?? [],
                  agent_id: session.agent_id,
                }),
              });
            } catch (e) {
              console.error("Post-call webhook error:", e);
            }
          } else if (agentConfig.action_webhook_url) {
            console.warn("Post-call webhook rejected (unsafe URL):", agentConfig.action_webhook_url);
          }
        }

        // Cleanup session
        await (supabase.from("call_sessions") as any)
          .delete()
          .eq("call_control_id", callControlId);

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("telnyx-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ─── Helper Functions ───

async function getTelnyxKey(userId: string | null): Promise<string> {
  if (userId) {
    const { data } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", "telnyx")
      .single();
    if (data?.api_key) return data.api_key;
  }
  const { data } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "telnyx_api_key")
    .single();
  return (data as any)?.value ?? Deno.env.get("TELNYX_API_KEY") ?? "";
}

async function getElevenLabsKey(userId: string): Promise<string> {
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", "elevenlabs")
    .single();
  if (data?.api_key) return data.api_key;

  const { data: platform } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "elevenlabs_api_key")
    .single();
  return (platform as any)?.value ?? Deno.env.get("ELEVENLABS_API_KEY") ?? "";
}

async function telnyxAction(
  callControlId: string,
  action: string,
  params: object,
  userId: string | null
) {
  const apiKey = await getTelnyxKey(userId);
  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${callControlId}/actions/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );
  await res.text();
  return res;
}

async function generateTTS(
  text: string,
  userId: string,
  voiceId?: string | null,
  stability?: number | null,
  speed?: number | null
): Promise<string | null> {
  const apiKey = await getElevenLabsKey(userId);
  if (!apiKey) return null;

  const voice = voiceId ?? "EXAVITQu4vr4xnSDxMaL";
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: stability ?? 0.5,
          similarity_boost: 0.75,
          speed: speed ?? 1.0,
        },
      }),
    }
  );

  if (!res.ok) {
    await res.text();
    return null;
  }

  const audioBuffer = await res.arrayBuffer();
  const fileName = `tts/${crypto.randomUUID()}.mp3`;
  const { data } = await supabase.storage
    .from("call-audio")
    .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: false });

  if (!data) return null;

  const { data: urlData } = supabase.storage.from("call-audio").getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function getAgentLLMResponse(
  agent: Record<string, unknown>,
  messages: Array<{ role: string; content: string }>,
  userId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          messages,
          user_id: userId,
          channel: "voice",
        }),
      }
    );
    const data = await res.json();
    return (data.response as string) ?? null;
  } catch {
    return null;
  }
}

async function sendSMS(from: string, to: string, message: string, userId: string) {
  const apiKey = await getTelnyxKey(userId);
  return fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, text: message }),
  });
}
