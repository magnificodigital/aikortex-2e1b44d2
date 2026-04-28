import { useState, useEffect, useRef, useCallback } from "react";
import { useAgentBuilder } from "@/contexts/AgentBuilderContext";
import { Bot, Wifi, Send, Mic, MicOff, Phone, PhoneOff, Volume2, AudioLines, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ── Voice Agent Panel ── */
const VoiceAgentPanel = () => {
  const { structuredConfig } = useAgentBuilder();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const animationRef = useRef<number>();

  const name = structuredConfig?.name || "Meu Agente";

  // Simulated volume animation when active
  useEffect(() => {
    if (isActive && !isMuted) {
      const animate = () => {
        setVolume(Math.random() * 0.6 + 0.1);
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(() => {
            animationRef.current = requestAnimationFrame(animate);
          }, 150);
        });
      };
      animate();
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    } else {
      setVolume(0);
    }
  }, [isActive, isMuted]);

  // Toggle listening simulation
  useEffect(() => {
    if (!isActive) { setIsListening(false); return; }
    const interval = setInterval(() => {
      setIsListening(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleActive = () => setIsActive(prev => !prev);

  // Generate wave bars
  const bars = Array.from({ length: 24 }, (_, i) => {
    const center = 12;
    const dist = Math.abs(i - center) / center;
    const base = isActive ? (1 - dist * 0.6) * volume : 0.05;
    const h = Math.max(4, base * 48 + Math.random() * 8);
    return h;
  });

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
          isActive ? "bg-emerald-500/20" : "bg-primary/20"
        }`}>
          <AudioLines className={`h-5 w-5 ${isActive ? "text-emerald-500" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <div className="flex items-center gap-1 text-xs">
            {isActive ? (
              <span className="text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isListening ? "Ouvindo..." : "Falando..."}
              </span>
            ) : (
              <span className="text-muted-foreground">Desativado</span>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">Voz</Badge>
      </div>

      {/* Visualization area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background/50 min-h-[220px] gap-6">
        {/* Avatar with pulse */}
        <div className="relative">
          {isActive && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute -inset-2 rounded-full bg-primary/5 animate-pulse" />
            </>
          )}
          <div className={`relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${
            isActive
              ? "bg-gradient-to-br from-primary/30 to-emerald-500/20 shadow-lg shadow-primary/10"
              : "bg-muted/60"
          }`}>
            <Bot className={`h-10 w-10 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>

        {/* Audio waveform */}
        <div className="flex items-center gap-[2px] h-12 w-full max-w-[200px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-150 ${
                isActive
                  ? isListening
                    ? "bg-blue-400/60"
                    : "bg-primary/50"
                  : "bg-muted-foreground/15"
              }`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Status text */}
        <p className="text-xs text-muted-foreground text-center">
          {isActive
            ? isListening
              ? "🎙️ O agente está ouvindo você..."
              : "🔊 O agente está respondendo..."
            : "Clique no botão abaixo para iniciar uma conversa por voz com o agente."
          }
        </p>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className={`h-10 w-10 rounded-full transition-all ${isMuted ? "bg-destructive/10 border-destructive/30 text-destructive" : ""}`}
          onClick={() => setIsMuted(prev => !prev)}
          disabled={!isActive}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button
          size="icon"
          className={`h-14 w-14 rounded-full transition-all shadow-lg ${
            isActive
              ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20"
              : "bg-primary hover:bg-primary/90 shadow-primary/20"
          }`}
          onClick={toggleActive}
        >
          {isActive ? <PhoneOff className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          disabled={!isActive}
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Info bar */}
      <div className="px-4 py-2 bg-muted/30 border-t border-border">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Latência: ~200ms</span>
          <span>Modelo: ElevenLabs</span>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Settings2 className="w-3 h-3" /> Config
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Chat Preview (existing) ── */
const ChatPreview = () => {
  const { structuredConfig, agentType, step } = useAgentBuilder();

  const name = structuredConfig?.name || "Meu Agente";
  const greeting = structuredConfig?.greetingMessage || "Olá! Como posso te ajudar?";
  const quickReplies = structuredConfig?.quickReplies || [];

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-500">
            <Wifi className="h-3 w-3" /> Online
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{agentType}</Badge>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-background/50 min-h-[200px]">
        <div className="flex gap-2 max-w-[85%]">
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="rounded-xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
            {greeting}
          </div>
        </div>

        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-9">
            {quickReplies.map((qr, i) => (
              <button
                key={i}
                className="px-3 py-1 rounded-full border border-primary/30 text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {step === "describe" && !structuredConfig && (
          <p className="text-xs text-muted-foreground text-center pt-8">
            Descreva seu agente para ver o preview aqui
          </p>
        )}
      </div>

      {/* Input mock */}
      <div className="px-3 py-2 border-t border-border flex items-center gap-2">
        <div className="flex-1 rounded-full bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Digite uma mensagem...
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Send className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
};

/* ── Main Preview with Tabs ── */
const AgentPreview = () => {
  const { structuredConfig, agentType } = useAgentBuilder();

  const name = structuredConfig?.name || "Meu Agente";
  const tone = structuredConfig?.toneOfVoice || "—";
  const language = structuredConfig?.language || "Português";
  const stagesCount = structuredConfig?.stages?.length || 0;

  return (
    <div className="flex flex-col h-full gap-3">
      <Tabs defaultValue="voice" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full shrink-0">
          <TabsTrigger value="voice" className="flex-1 gap-1.5 text-xs">
            <AudioLines className="h-3.5 w-3.5" /> Voz
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 gap-1.5 text-xs">
            <Send className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="flex-1 mt-3 min-h-0">
          <VoiceAgentPanel />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 mt-3 min-h-0">
          <ChatPreview />
        </TabsContent>
      </Tabs>

      {/* Summary panel */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2 shrink-0">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Nome</span>
          <span className="font-medium truncate">{name}</span>
          <span className="text-muted-foreground">Tipo</span>
          <span className="font-medium">{agentType}</span>
          <span className="text-muted-foreground">Tom</span>
          <span className="font-medium truncate">{tone}</span>
          <span className="text-muted-foreground">Idioma</span>
          <span className="font-medium">{language}</span>
          <span className="text-muted-foreground">Estágios</span>
          <span className="font-medium">{stagesCount}</span>
        </div>
      </div>
    </div>
  );
};

export default AgentPreview;
