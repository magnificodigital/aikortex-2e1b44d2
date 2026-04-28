import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Languages,
  ChevronDown,
  ChevronUp,
  X,
  Mic,
  MicOff,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meeting-translate`;

const LANGUAGES = [
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "Japonês" },
  { code: "ko", label: "Coreano" },
  { code: "zh", label: "Chinês" },
  { code: "ar", label: "Árabe" },
  { code: "ru", label: "Russo" },
  { code: "hi", label: "Hindi" },
];

interface TranslatedLine {
  original: string;
  translated: string;
  timestamp: number;
}

interface Props {
  isListening: boolean;
  recentPhrases: { text: string; timestamp: number }[];
  onToggleListening: () => void;
  isSupported: boolean;
}

const MeetingTranslationPanel = ({
  isListening,
  recentPhrases,
  onToggleListening,
  isSupported,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [translations, setTranslations] = useState<TranslatedLine[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTranslatedRef = useRef<number>(0);
  const debounceRef = useRef<number>();

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [translations]);

  // Translate new phrases
  useEffect(() => {
    if (!isOpen || recentPhrases.length === 0) return;

    const newPhrases = recentPhrases.filter(
      (p) => p.timestamp > lastTranslatedRef.current
    );
    if (newPhrases.length === 0) return;

    // Debounce translations
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const text = newPhrases.map((p) => p.text).join(". ");
      lastTranslatedRef.current = newPhrases[newPhrases.length - 1].timestamp;

      setIsTranslating(true);
      try {
        const resp = await fetch(TRANSLATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, targetLang }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          if (resp.status === 429) toast.error("Limite de tradução excedido");
          else if (resp.status === 402) toast.error("Créditos insuficientes");
          return;
        }

        const data = await resp.json();
        if (data.translation) {
          setTranslations((prev) => [
            ...prev.slice(-49),
            {
              original: text,
              translated: data.translation,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch {
        console.error("Translation error");
      } finally {
        setIsTranslating(false);
      }
    }, 1500);
  }, [recentPhrases, isOpen, targetLang]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-20 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm font-medium"
      >
        <Languages className="w-4 h-4" />
        Tradutor
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-20 left-4 z-50 flex flex-col rounded-xl border border-white/15 bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl transition-all ${
        isMinimized ? "w-72 h-12" : "w-80 sm:w-96"
      }`}
      style={isMinimized ? {} : { height: "min(400px, 50vh)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 cursor-pointer shrink-0"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Languages className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white">Tradutor em Tempo Real</span>
            {isListening && (
              <span className="ml-1.5 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400">Ouvindo</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isMinimized ? (
            <ChevronUp className="w-4 h-4 text-white/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/50" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Controls */}
          <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleListening}
              disabled={!isSupported}
              className={`h-7 gap-1.5 text-xs ${
                isListening
                  ? "text-green-400 hover:text-green-300"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              {isListening ? "Pausar" : "Ouvir"}
            </Button>
            <div className="flex-1" />
            <span className="text-[10px] text-white/40 mr-1">Traduzir para:</span>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-28 h-7 text-[11px] bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-white text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translations */}
          <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
            <div className="space-y-3">
              {!isSupported && (
                <p className="text-xs text-red-400 text-center py-4">
                  Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.
                </p>
              )}
              {isSupported && translations.length === 0 && !isListening && (
                <div className="text-center py-6 space-y-2">
                  <Languages className="w-8 h-8 text-cyan-400 mx-auto opacity-50" />
                  <p className="text-xs text-white/40">
                    Clique em "Ouvir" para iniciar a tradução em tempo real.
                  </p>
                </div>
              )}
              {isSupported && translations.length === 0 && isListening && (
                <div className="text-center py-6 space-y-2">
                  <div className="flex justify-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-xs text-white/40">Aguardando fala...</p>
                </div>
              )}
              {translations.map((t, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] text-white/40">{t.original}</p>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-cyan-100">{t.translated}</p>
                  </div>
                </div>
              ))}
              {isTranslating && (
                <div className="flex items-center gap-2 text-xs text-cyan-300">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  Traduzindo...
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default MeetingTranslationPanel;
