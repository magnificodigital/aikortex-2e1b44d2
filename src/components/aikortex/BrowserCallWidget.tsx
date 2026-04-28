import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentPrompt?: string;
  agentGreeting?: string;
  voiceId?: string;
}

type Status = "idle" | "connecting" | "connected" | "ended";

const BrowserCallWidget = ({
  open, onClose, agentId, agentName, agentAvatar,
  agentPrompt, agentGreeting, voiceId,
}: Props) => {
  const [status, setStatus] = useState<Status>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [minimized, setMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startRef = useRef(0);
  const roomNameRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);
  const processingRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopRecognition();
  }, []);

  const stopRecognition = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  };

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Navegador não suporta reconhecimento de voz. Use Chrome.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const text = last[0].transcript.trim();
      if (!text || processingRef.current) return;

      processingRef.current = true;
      setTranscript(prev => [...prev, { role: "user", text }]);
      messagesRef.current.push({ role: "user", content: text });

      try {
        // Get AI response
        const { data, error } = await supabase.functions.invoke("agent-chat", {
          body: {
            agent_id: agentId,
            messages: messagesRef.current,
            channel: "voice",
          },
        });

        if (error || !data?.response) {
          console.error("agent-chat error:", error);
          processingRef.current = false;
          return;
        }

        const aiText = data.response;
        setTranscript(prev => [...prev, { role: "agent", text: aiText }]);
        messagesRef.current.push({ role: "assistant", content: aiText });

        // Generate TTS
        await playTTS(aiText);
      } catch (err) {
        console.error("Processing error:", err);
      } finally {
        processingRef.current = false;
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Restart if still connected
      if (status === "connected" && recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [agentId, status]);

  const playTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
      const vid = voiceId || "EXAVITQu4vr4xnSDxMaL";
      const session = (await supabase.auth.getSession()).data.session;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/browser-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: vid }),
        },
      );

      if (resp.ok && resp.headers.get("content-type")?.includes("audio")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleStart = useCallback(async () => {
    setStatus("connecting");
    setTranscript([]);
    setDuration(0);
    messagesRef.current = [];

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create LiveKit room + log call
      const { data, error } = await supabase.functions.invoke("livekit-call", {
        body: { agent_id: agentId },
      });

      if (error || !data?.token) {
        const msg = data?.error || "Erro ao iniciar chamada no navegador";
        toast.error(msg);
        setStatus("idle");
        return;
      }

      roomNameRef.current = data.room_name;

      // Connected
      setStatus("connected");
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);

      // Start speech recognition
      startRecognition();

      // Play greeting if configured
      if (agentGreeting) {
        setTranscript(prev => [...prev, { role: "agent", text: agentGreeting }]);
        messagesRef.current.push({ role: "assistant", content: agentGreeting });
        await playTTS(agentGreeting);
      }
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Permissão de microfone necessária.");
      } else {
        toast.error(err?.message || "Erro ao iniciar ligação.");
      }
      setStatus("idle");
    }
  }, [agentId, agentGreeting, startRecognition]);

  const handleEnd = useCallback(async () => {
    stopRecognition();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSpeaking(false);
    setStatus("ended");

    // Update call log
    if (roomNameRef.current) {
      const dur = Math.floor((Date.now() - startRef.current) / 1000);
      try {
        await supabase
          .from("call_logs")
          .update({
            status: "completed",
            duration_seconds: dur,
            ended_at: new Date().toISOString(),
            transcript: messagesRef.current,
          })
          .eq("telnyx_call_id", roomNameRef.current);
      } catch {}
    }
  }, []);

  const handleMuteToggle = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        try { recognitionRef.current?.stop(); } catch {}
      } else {
        try { recognitionRef.current?.start(); } catch {}
      }
      return next;
    });
  };

  // Auto-start on open
  useEffect(() => {
    if (open && status === "idle") handleStart();
  }, [open]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!open) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-card border border-border rounded-2xl shadow-2xl transition-all ${
      minimized ? "w-[200px]" : "w-[340px]"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {agentAvatar && (
            <img src={agentAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          )}
          <div>
            <p className="text-xs font-semibold text-foreground">{agentName}</p>
            <Badge
              variant="outline"
              className={`text-[9px] ${
                status === "connected"
                  ? "border-emerald-500/30 text-emerald-500"
                  : status === "connecting"
                    ? "border-yellow-500/30 text-yellow-500 animate-pulse"
                    : "border-border text-muted-foreground"
              }`}
            >
              {status === "idle" && "Pronto"}
              {status === "connecting" && "Conectando..."}
              {status === "connected" && (isSpeaking ? "Falando..." : "Ouvindo...")}
              {status === "ended" && "Encerrada"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(!minimized)}>
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { handleEnd(); onClose(); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Timer */}
          <div className="text-center py-4">
            <p className={`text-3xl font-mono font-light tabular-nums ${
              status === "connected" ? "text-foreground" : "text-muted-foreground/50"
            }`}>
              {formatTime(duration)}
            </p>
          </div>

          {/* Transcript */}
          <ScrollArea className="h-[120px] px-4">
            <div className="space-y-2">
              {transcript.slice(-6).map((t, i) => (
                <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[11px] ${
                    t.role === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted"
                  }`}>
                    {t.text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 py-4">
            {status === "connected" && (
              <Button
                variant="outline"
                size="icon"
                className={`h-10 w-10 rounded-full ${
                  isMuted ? "bg-destructive/10 border-destructive/30 text-destructive" : ""
                }`}
                onClick={handleMuteToggle}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}

            {(status === "idle" || status === "ended") && (
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600"
                onClick={handleStart}
              >
                <Phone className="w-5 h-5 text-white" />
              </Button>
            )}

            {(status === "connected" || status === "connecting") && (
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90"
                onClick={handleEnd}
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BrowserCallWidget;
