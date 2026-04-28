import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, VideoOff, Mic, MicOff, ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  defaultName: string;
  isConnecting: boolean;
  onJoin: (name: string) => void;
  onCancel?: () => void;
  isGuest?: boolean;
}

const MeetingPreJoin = ({ title, defaultName, isConnecting, onJoin, onCancel, isGuest }: Props) => {
  const [name, setName] = useState(defaultName);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPreview = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });
      setStream(s);
      setMediaError("");
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setMediaError("Permissão negada. Habilite câmera e microfone nas configurações do navegador.");
      } else if (e.name === "NotFoundError") {
        setMediaError("Nenhuma câmera ou microfone encontrado.");
      } else {
        setMediaError("Erro ao acessar dispositivos de mídia.");
      }
    }
  }, [videoEnabled, audioEnabled]);

  useEffect(() => {
    startPreview();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = videoEnabled);
      stream.getAudioTracks().forEach(t => t.enabled = audioEnabled);
    }
  }, [videoEnabled, audioEnabled, stream]);

  const handleJoin = () => {
    stream?.getTracks().forEach(t => t.stop());
    onJoin(name || "Participante");
  };

  return (
    <div className="flex bg-background" style={{ minHeight: "100dvh" }}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-1">
            {onCancel && (
              <button onClick={onCancel} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {isGuest
                ? "Insira seu nome para entrar na reunião"
                : "Configure seu áudio e vídeo antes de entrar"}
            </p>
          </div>

          {/* Video preview */}
          <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border border-border">
            {videoEnabled && !mediaError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <VideoOff className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {mediaError || "Câmera desativada"}
                  </p>
                </div>
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant={audioEnabled ? "secondary" : "destructive"}
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={() => setAudioEnabled(!audioEnabled)}
              >
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              <Button
                variant={videoEnabled ? "secondary" : "destructive"}
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={() => setVideoEnabled(!videoEnabled)}
              >
                {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Seu nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como você quer ser identificado?"
            />
          </div>

          {/* Join button */}
          <Button
            className="w-full gap-2 h-11"
            onClick={handleJoin}
            disabled={isConnecting || !name.trim()}
          >
            {isConnecting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Conectando...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" /> Entrar na Reunião
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MeetingPreJoin;
