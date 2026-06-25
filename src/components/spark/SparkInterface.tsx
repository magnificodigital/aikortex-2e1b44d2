import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MessageSquare, Loader2, Settings, X, ArrowUp, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SparkOrb } from "./SparkOrb";
import { cn } from "@/lib/utils";

type Mode = "voice" | "text";
type OrbState = "idle" | "connecting" | "listening" | "speaking" | "error";

interface TranscriptEntry {
  id: string;
  role: "user" | "agent";
  text: string;
}

const TEXT_SUGGESTIONS = [
  ["Agente SDR para WhatsApp", "Agente de Suporte 24/7", "Dashboard de Vendas"],
  ["Agente de Qualificação", "CRM Completo", "Landing Page"],
  ["Agente BDR LinkedIn", "Portal de Clientes", "Sistema de Tarefas"],
];

interface SparkInterfaceProps {
  greeting: string;
  userName: string;
  honorific: string;
  onTextSubmit: (text: string) => void;
}

export function SparkInterface(props: SparkInterfaceProps) {
  return (
    <ConversationProvider>
      <SparkInterfaceInner {...props} />
    </ConversationProvider>
  );
}

function SparkInterfaceInner({ greeting, userName, honorific, onTextSubmit }: SparkInterfaceProps) {
  const [mode, setMode] = useState<Mode>("voice");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const rafRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const conversation = useConversation({
    onConnect: () => setOrbState("listening"),
    onDisconnect: () => setOrbState("idle"),
    onError: (err: unknown) => {
      console.error("[spark] elevenlabs error", err);
      setOrbState("error");
      toast.error("Erro na conexão com o Spark");
    },
    onMessage: (msg: any) => {
      // SDK normalized message: { message, source } or { text, type }
      const text: string | undefined = msg?.message ?? msg?.text ?? msg?.transcript;
      const source: string | undefined = msg?.source ?? msg?.role ?? msg?.type;
      if (!text) return;
      const role: "user" | "agent" =
        source === "user" || source === "user_transcript" ? "user" : "agent";
      setTranscript((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, role, text },
      ]);
    },
  });

  const isSpeaking = (conversation as any).isSpeaking as boolean | undefined;
  const status = conversation.status;

  useEffect(() => {
    if (status === "connected") {
      setOrbState(isSpeaking ? "speaking" : "listening");
    } else if (status === "disconnected" && orbState !== "error") {
      setOrbState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isSpeaking]);

  // Reactive audio level for orb pulsation
  useEffect(() => {
    if (status !== "connected") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setIntensity(0);
      return;
    }
    const tick = () => {
      try {
        const input = (conversation as any).getInputVolume?.() ?? 0;
        const output = (conversation as any).getOutputVolume?.() ?? 0;
        setIntensity(Math.max(input, output));
      } catch {
        /* noop */
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, conversation]);

  const startVoice = useCallback(async () => {
    try {
      setOrbState("connecting");
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke("spark-token", {});
      if (error || !data?.token) {
        const errBody = (error as any)?.context?.body;
        let msg = (data as any)?.message ?? "Falha ao obter token";
        if (errBody) {
          try {
            const parsed = typeof errBody === "string" ? JSON.parse(errBody) : errBody;
            msg = parsed?.message ?? msg;
          } catch {
            /* noop */
          }
        }
        setOrbState("error");
        toast.error(msg, {
          action: {
            label: "Configurar",
            onClick: () => navigate("/settings?tab=integrations"),
          },
        });
        return;
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (e) {
      console.error("[spark] startVoice error", e);
      setOrbState("error");
      toast.error("Não foi possível iniciar o Spark por voz");
    }
  }, [conversation, navigate]);

  const stopVoice = useCallback(async () => {
    try {
      await Promise.resolve(conversation.endSession());
    } catch (e) {
      console.warn("[spark] endSession failed", e);
    }
    setOrbState("idle");
  }, [conversation]);

  const handleOrbClick = () => {
    if (status === "connected") {
      stopVoice();
    } else if (orbState !== "connecting") {
      startVoice();
    }
  };

  const handleSwitchToText = async () => {
    if (status === "connected") await stopVoice();
    setMode("text");
  };

  const handleSwitchToVoice = () => {
    setMode("voice");
    setOrbState("idle");
  };

  const submitText = () => {
    const t = textInput.trim();
    if (!t) return;
    onTextSubmit(t);
  };

  const orbHint = (() => {
    switch (orbState) {
      case "idle":
        return "Toque na esfera para falar com o Spark";
      case "connecting":
        return "Conectando…";
      case "listening":
        return "Estou te ouvindo";
      case "speaking":
        return "Spark falando…";
      case "error":
        return "Toque para tentar novamente";
    }
  })();

  const currentSuggestions = TEXT_SUGGESTIONS[suggestionIndex % TEXT_SUGGESTIONS.length];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-8 relative">
      {/* Mode toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full border border-border bg-card/50 backdrop-blur-sm p-1">
        <button
          onClick={handleSwitchToVoice}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            mode === "voice" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Mic className="w-3.5 h-3.5" />
          Voz
        </button>
        <button
          onClick={handleSwitchToText}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            mode === "text" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Texto
        </button>
      </div>

      <h1 className="text-3xl lg:text-5xl font-light text-foreground mb-3 text-center">
        {greeting}, {honorific}. <span className="italic">{userName}</span>
      </h1>
      <p className="text-sm lg:text-base text-muted-foreground mb-10 text-center max-w-lg">
        {mode === "voice"
          ? "Spark, seu copiloto de voz. Fale o que precisa — eu cuido do resto."
          : "Crie Agentes inteligentes e Aplicações para WhatsApp e Web em minutos conversando com a inteligência artificial."}
      </p>

      {mode === "voice" ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
          <div className="relative">
            <SparkOrb
              state={orbState}
              intensity={intensity}
              onClick={handleOrbClick}
              disabled={orbState === "connecting"}
            />
            {orbState === "connecting" && (
              <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-primary animate-spin" />
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center min-h-[1.5rem]">{orbHint}</p>

          {transcript.length > 0 && (
            <div className="w-full max-h-64 overflow-y-auto rounded-2xl border border-border bg-card/40 backdrop-blur-sm px-4 py-3 space-y-2">
              {transcript.slice(-8).map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "text-sm leading-relaxed",
                    entry.role === "user" ? "text-foreground" : "text-muted-foreground italic",
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-50 mr-2">
                    {entry.role === "user" ? "Você" : "Spark"}
                  </span>
                  {entry.text}
                </div>
              ))}
            </div>
          )}

          {transcript.length > 0 && (
            <button
              onClick={() => setTranscript([])}
              className="text-xs text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar transcrição
            </button>
          )}

          <Link
            to="/settings?tab=integrations"
            className="text-[11px] text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> Configurar chave ElevenLabs
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden mb-6">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Descreva o agente ou app que você quer criar..."
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 px-5 py-4 min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitText();
                }
              }}
            />
            <div className="flex items-center justify-end px-4 pb-3">
              <Button
                size="sm"
                className="h-9 px-5 rounded-full gap-1.5"
                disabled={!textInput.trim()}
                onClick={submitText}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {currentSuggestions.map((label) => (
              <button
                key={label}
                onClick={() => setTextInput(label)}
                className="px-4 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setSuggestionIndex((i) => i + 1)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
