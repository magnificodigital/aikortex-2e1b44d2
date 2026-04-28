import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAgentRuntimeUrl } from "@/lib/ai-endpoints";
import { toast } from "sonner";

const FLUSH_INTERVAL_MS = 60;
const CRM_LEAD_REGEX = /<<<CRM_LEAD>>>([\s\S]*?)<<<END>>>/;

/** Detects a CRM_LEAD JSON block in the agent reply and persists it to the leads table. */
async function processCrmLeadBlock(text: string): Promise<string> {
  const match = text.match(CRM_LEAD_REGEX);
  if (!match) return text;

  const jsonStr = match[1].trim();
  try {
    const data = JSON.parse(jsonStr);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return text.replace(CRM_LEAD_REGEX, "").trim();

    const meeting = data.meeting || {};
    const activities: any[] = [];
    if (meeting.scheduled_at) {
      activities.push({
        id: `act-${Date.now()}`,
        type: "meeting",
        description: `Reunião agendada para ${new Date(meeting.scheduled_at).toLocaleString("pt-BR")} (${meeting.duration_minutes || 15} min) — ${meeting.topic || "Discovery"}`,
        createdAt: new Date().toISOString(),
        createdBy: "Agente IA",
      });
    }

    const { error } = await supabase.from("leads").insert({
      user_id: user.id,
      name: data.name || "Lead sem nome",
      email: data.email || "",
      phone: data.phone || "",
      company: data.company || "",
      position: data.position || "",
      stage: data.stage || "lead",
      source: data.source || "manual",
      temperature: data.temperature || "morno",
      value: Number(data.value) || 0,
      notes: data.notes || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      assignee: "Agente IA",
      activities,
      lost_reason: data.lost_reason || null,
    });

    if (error) {
      console.error("CRM insert error:", error);
      toast.error("Não foi possível salvar o lead no CRM.");
    } else {
      toast.success(meeting.scheduled_at ? "✅ Lead salvo no CRM com reunião agendada!" : "✅ Lead salvo no CRM!");
    }
  } catch (e) {
    console.error("CRM block parse error:", e);
  }

  // Strip the technical block from the user-visible message
  return text.replace(CRM_LEAD_REGEX, "").trim();
}

export interface ChatMessage {
  role: "user" | "agent" | "assistant";
  text: string;
}

export interface ApiConfigParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: "text" | "json";
  stopSequences?: string[];
}

export interface AgentChatContext {
  name: string;
  role?: string;
  companyName?: string;
  description?: string;
  objective?: string;
  instructions?: string;
  toneOfVoice?: string;
  greetingMessage?: string;
  memory?: string;
  channels?: string[];
  integrations?: string[];
  tools?: string[];
  knowledgeFiles?: string[];
  urls?: string[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: "text" | "json";
  stopSequences?: string[];
}

interface UseAgentChatOptions {
  provider?: string;
  model?: string;
  useGateway?: boolean;
  gatewayModel?: string;
  systemPrompt?: string;
  persistKey?: string;
  apiConfig?: ApiConfigParams;
  agentContext?: AgentChatContext;
  /** When set to "wizard-setup", routes to the backend setup wizard prompt builder. */
  mode?: "agent-chat" | "wizard-setup";
  /** Agent type (sdr/sac/...) — required by the wizard-setup prompt builder. */
  agentType?: string;
  /** Disable CRM lead extraction post-processing (e.g. during wizard). */
  disableCrmExtraction?: boolean;
}

function deriveProvider(model?: string): string | undefined {
  if (!model) return undefined;
  // Models with a slash are OpenRouter-routed (platform-provided) — no single "provider" to validate against
  if (model.includes("/")) return undefined;
  if (model.startsWith("gemini")) return "gemini";
  if (model.startsWith("gpt")) return "openai";
  if (model.startsWith("claude")) return "anthropic";
  return undefined;
}

export function useAgentChat(initialMessages: ChatMessage[] = [], options: UseAgentChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (options.persistKey) {
      try {
        const stored = localStorage.getItem(options.persistKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return initialMessages;
  });
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesRef = useRef(messages);
  const pendingTextRef = useRef("");
  const flushScheduledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (options.persistKey && messages.length > 0) {
      localStorage.setItem(options.persistKey, JSON.stringify(messages));
    }
  }, [messages, options.persistKey]);

  /** Batched state update for streaming tokens — uses RAF to stay in React's scheduling */
  const flushPendingText = useCallback((force = false) => {
    const doFlush = () => {
      flushScheduledRef.current = false;
      if (!mountedRef.current) return;
      const text = pendingTextRef.current;
      setMessages((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last.role !== "agent" || last.text === text) return prev;
        const next = prev.slice();
        next[next.length - 1] = { role: "agent", text };
        return next;
      });
    };

    if (force) {
      flushScheduledRef.current = false;
      doFlush();
      return;
    }
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    // Use setTimeout with a safe interval; React batches these automatically in v18
    setTimeout(doFlush, FLUSH_INTERVAL_MS);
  }, []);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const inferredProvider = deriveProvider(options.model);
    if (options.provider && inferredProvider && options.provider !== inferredProvider) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `⚠️ O modelo **${options.model}** não pertence ao provider **${options.provider}**. Ajuste a configuração antes de testar.`,
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = { role: "user", text: userText };
    const nextMessages = [...messagesRef.current, userMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setIsStreaming(true);

    const apiMessages: Array<{ role: string; content: string }> = nextMessages.map((m) => ({
      role: m.role === "agent" ? "assistant" : m.role,
      content: m.text,
    }));

    if (options.systemPrompt) {
      apiMessages.unshift({ role: "system", content: options.systemPrompt });
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let resp: Response | null = null;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const payload: Record<string, any> = {
          mode: options.mode || "agent-chat",
          messages: apiMessages,
          useGateway: options.useGateway ?? false,
        };

        if (options.mode === "wizard-setup") {
          payload.agentType = options.agentType || "custom";
        }

        if (options.useGateway) {
          payload.model = options.gatewayModel || "google/gemini-2.5-flash";
        } else {
          payload.provider = options.provider || inferredProvider;
          payload.model = options.model;
          payload.agentContext = options.agentContext;
          if (options.apiConfig) {
            payload.temperature = options.apiConfig.temperature;
            payload.max_tokens = options.apiConfig.maxTokens;
            payload.top_p = options.apiConfig.topP;
            payload.frequency_penalty = options.apiConfig.frequencyPenalty;
            payload.presence_penalty = options.apiConfig.presencePenalty;
            payload.response_format = options.apiConfig.responseFormat === "json" ? { type: "json_object" } : undefined;
            payload.stop = options.apiConfig.stopSequences?.length ? options.apiConfig.stopSequences : undefined;
          }
        }

        resp = await fetch(getAgentRuntimeUrl(options.mode), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (resp.status !== 429 || attempt === maxRetries) break;
        const waitMs = (attempt + 1) * 2000;
        await new Promise((r) => setTimeout(r, waitMs));
      }

      if (!resp?.ok) {
        const err = await resp?.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err?.error || `Erro ${resp?.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");

      if (!mountedRef.current) return;

      const withPlaceholder = [...messagesRef.current, { role: "agent" as const, text: "" }];
      messagesRef.current = withPlaceholder;
      setMessages(withPlaceholder);
      pendingTextRef.current = "";

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!mountedRef.current) { reader.cancel(); return; }

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            flushPendingText(true);
            continue;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              pendingTextRef.current += content;
              flushPendingText();
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      flushPendingText(true);

      // After full stream completes, check for CRM_LEAD block and persist it.
      const finalText = pendingTextRef.current;
      if (!options.disableCrmExtraction && finalText && CRM_LEAD_REGEX.test(finalText)) {
        const cleanText = await processCrmLeadBlock(finalText);
        if (mountedRef.current) {
          setMessages((prev) => {
            if (!prev.length) return prev;
            const last = prev[prev.length - 1];
            if (last.role !== "agent") return prev;
            const next = prev.slice();
            next[next.length - 1] = { role: "agent", text: cleanText };
            return next;
          });
        }
      }
    } catch (e: any) {
      console.error("Agent chat error:", e);
      if (mountedRef.current) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: `⚠️ ${e.message || "Erro ao conectar com a IA."}` },
        ]);
      }
    } finally {
      if (mountedRef.current) {
        setIsStreaming(false);
      }
    }
  }, [isStreaming, options.provider, options.model, options.useGateway, options.gatewayModel, options.systemPrompt, options.apiConfig, options.agentContext, options.mode, options.agentType, options.disableCrmExtraction, flushPendingText]);

  return { messages, setMessages, sendMessage, isStreaming };
}
