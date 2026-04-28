import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/use-agent-chat";

const MANAGED_SESSION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/managed-session-chat`;
const AGENT_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
const FLUSH_INTERVAL_MS = 60;

export interface UseAgentSessionOptions {
  agentDbId: string;
  provider: string;
  channel?: string;
  contactIdentifier?: string;
  model?: string;
  systemPrompt?: string;
  agentContext?: Record<string, unknown>;
  apiConfig?: Record<string, unknown>;
  useGateway?: boolean;
  gatewayModel?: string;
}

export function useAgentSession(options: UseAgentSessionOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "running" | "terminated">("idle");

  const messagesRef = useRef(messages);
  const pendingTextRef = useRef("");
  const flushScheduledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

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

    if (force) { doFlush(); return; }
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    setTimeout(doFlush, FLUSH_INTERVAL_MS);
  }, []);

  const useManagedSession = options.provider === "anthropic";

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", text: userText };
    const nextMessages = [...messagesRef.current, userMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setIsStreaming(true);
    setSessionStatus("running");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let resp: Response;

      if (useManagedSession) {
        resp = await fetch(MANAGED_SESSION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            agent_db_id: options.agentDbId,
            message: userText,
            contact_identifier: options.contactIdentifier,
            channel: options.channel || "chat",
          }),
        });
      } else {
        const apiMessages: Array<{ role: string; content: string }> = nextMessages.map((m) => ({
          role: m.role === "agent" ? "assistant" : m.role,
          content: m.text,
        }));

        if (options.systemPrompt) {
          apiMessages.unshift({ role: "system", content: options.systemPrompt });
        }

        const payload: Record<string, unknown> = {
          mode: "agent-chat",
          messages: apiMessages,
          useGateway: options.useGateway ?? false,
          provider: options.provider,
          model: options.model,
          agentContext: options.agentContext,
        };

        if (options.useGateway) {
          payload.model = options.gatewayModel || "google/gemini-2.5-flash";
        }

        if (options.apiConfig) {
          Object.assign(payload, options.apiConfig);
        }

        resp = await fetch(AGENT_CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));

        // ── Rule 5: Handle BYOK_REQUIRED error with clear feedback ──
        if (err?.code === "BYOK_REQUIRED") {
          toast.error(err.error || "Chave de API própria é necessária.", {
            description: "Acesse Configurações → Integrações para adicionar sua chave.",
            duration: 8000,
            action: {
              label: "Ir para Integrações",
              onClick: () => {
                window.location.href = "/integrations";
              },
            },
          });
          if (mountedRef.current) {
            setMessages((prev) => [
              ...prev,
              { role: "agent", text: `🔑 ${err.error}` },
            ]);
          }
          return;
        }

        // Fallback: if managed session fails, try regular agent-chat
        if (useManagedSession && resp.status >= 500) {
          console.warn("Managed session failed, falling back to agent-chat");
          const apiMessages: Array<{ role: string; content: string }> = nextMessages.map((m) => ({
            role: m.role === "agent" ? "assistant" : m.role,
            content: m.text,
          }));

          const fallbackResp = await fetch(AGENT_CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              mode: "agent-chat",
              messages: apiMessages,
              useGateway: true,
              model: "google/gemini-2.5-flash",
              agentContext: options.agentContext,
            }),
          });

          if (fallbackResp.ok && fallbackResp.body) {
            await processStream(fallbackResp.body);
            return;
          }
        }

        throw new Error(err?.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");
      await processStream(resp.body);
    } catch (e: unknown) {
      console.error("Agent session error:", e);
      if (mountedRef.current) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: `⚠️ ${e instanceof Error ? e.message : "Erro ao conectar com a IA."}` },
        ]);
      }
    } finally {
      if (mountedRef.current) {
        setIsStreaming(false);
        setSessionStatus("idle");
      }
    }

    async function processStream(body: ReadableStream<Uint8Array>) {
      if (!mountedRef.current) return;

      const withPlaceholder = [...messagesRef.current, { role: "agent" as const, text: "" }];
      messagesRef.current = withPlaceholder;
      setMessages(withPlaceholder);
      pendingTextRef.current = "";

      const reader = body.getReader();
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
            // partial JSON
          }
        }
      }

      flushPendingText(true);
    }
  }, [isStreaming, useManagedSession, options, flushPendingText]);

  return { messages, setMessages, sendMessage, isStreaming, sessionStatus };
}
