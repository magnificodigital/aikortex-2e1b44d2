import { useState, useEffect, useRef, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  enabled?: boolean;
}

interface TranscriptEntry {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export function useSpeechRecognition({
  lang = "pt-BR",
  continuous = true,
  interimResults = true,
  enabled = false,
}: UseSpeechRecognitionOptions = {}) {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recentPhrases, setRecentPhrases] = useState<TranscriptEntry[]>([]);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<number>();

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript((prev) => prev + " " + final);
        setRecentPhrases((prev) => [
          ...prev.slice(-19),
          { text: final.trim(), timestamp: Date.now(), isFinal: true },
        ]);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.warn("SpeechRecognition error:", event.error);
      if (event.error === "not-allowed") {
        setIsListening(false);
        return;
      }
      // auto-restart on network or other transient errors
      if (enabled) {
        restartTimeoutRef.current = window.setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // auto-restart if still enabled
      if (enabled) {
        restartTimeoutRef.current = window.setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}
  }, [lang, continuous, interimResults, enabled]);

  const stop = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (enabled && isSupported) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [enabled, isSupported]);

  // Get recent transcript (last N seconds)
  const getRecentTranscript = useCallback((secondsAgo: number = 60) => {
    const cutoff = Date.now() - secondsAgo * 1000;
    return recentPhrases
      .filter((p) => p.timestamp >= cutoff)
      .map((p) => p.text)
      .join(" ");
  }, [recentPhrases]);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    recentPhrases,
    getRecentTranscript,
    start,
    stop,
  };
}
