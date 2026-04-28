import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user using service role to verify the JWT token
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Use service role client to verify the user's JWT
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message, "Header present:", !!authHeader);
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-context client for RLS queries
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { agentName, agentPrompt, voiceId, firstMessage, language } = await req.json();

    // Get user's ElevenLabs API key
    const { data: keyRow } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", "elevenlabs")
      .maybeSingle();

    const elevenLabsKey = keyRow?.api_key;
    if (!elevenLabsKey) {
      return new Response(
        JSON.stringify({ error: "Chave de API da ElevenLabs não configurada. Vá em Integrações para adicionar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create a temporary conversational AI agent
    const agentLang = language || "pt";
    const isEnglish = agentLang === "en";
    
    const agentBody: Record<string, unknown> = {
      name: `${agentName || "Agente"} - Sessão`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: agentPrompt || `Você é o agente ${agentName || "IA"}. Responda sempre em português brasileiro de forma profissional e amigável.`,
          },
          first_message: firstMessage || `Olá! Sou ${agentName || "seu agente"}. Como posso ajudar?`,
          language: agentLang,
        },
        asr: {
          ...(!isEnglish && { model: "custom" }),
        },
        tts: {
          voice_id: voiceId || "EXAVITQu4vr4xnSDxMaL",
          ...(!isEnglish && { model_id: "eleven_turbo_v2_5" }),
        },
      },
    };

    const createResp = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agentBody),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      console.error("ElevenLabs create agent error:", createResp.status, errText);
      
      // Check for permission error
      let userMessage = `Erro ao criar agente ElevenLabs: ${createResp.status}`;
      if (errText.includes("missing_permissions") || errText.includes("convai_write")) {
        userMessage = "Sua chave de API da ElevenLabs não tem permissão para Conversational AI. Acesse elevenlabs.io → API Keys → edite sua chave e habilite a permissão 'Conversational AI'.";
      }
      
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { agent_id } = await createResp.json();
    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "Não foi possível obter o ID do agente criado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get a conversation token for the agent
    const tokenResp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agent_id}`,
      {
        headers: { "xi-api-key": elevenLabsKey },
      }
    );

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.error("ElevenLabs token error:", tokenResp.status, errText);
      return new Response(
        JSON.stringify({ error: `Erro ao obter token de conversa: ${tokenResp.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { signed_url } = await tokenResp.json();

    return new Response(
      JSON.stringify({ agent_id, signed_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("elevenlabs-voice-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
