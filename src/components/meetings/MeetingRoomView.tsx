import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { DisconnectReason, RoomEvent } from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  Video,
  Share2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import FloatingParticipants from "./FloatingParticipants";
import WaitingRoomNotifications from "./WaitingRoomNotifications";
import MeetingTimer from "./MeetingTimer";
import SalesMentorPanel from "./SalesMentorPanel";
import MeetingTranslationPanel from "./MeetingTranslationPanel";
import MeetingSettingsDialog from "./MeetingSettingsDialog";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

interface Props {
  token: string;
  serverUrl: string;
  meetingTitle: string;
  isHost: boolean;
  roomId: string;
  meetingId: string;
  onLeave: () => void;
}

const shouldLeaveOnDisconnect = (reason?: DisconnectReason) => {
  if (reason === undefined) return true;
  return [
    DisconnectReason.DUPLICATE_IDENTITY,
    DisconnectReason.PARTICIPANT_REMOVED,
    DisconnectReason.ROOM_DELETED,
    DisconnectReason.ROOM_CLOSED,
    DisconnectReason.USER_REJECTED,
  ].includes(reason);
};

/* ── Inner component with room context ── */
const MeetingInner = ({ meetingTitle, isHost, roomId, meetingId, onLeave }: Omit<Props, "token" | "serverUrl">) => {
  const room = useRoomContext();
  const leavingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startedAt] = useState(() => Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);

  const {
    isListening,
    isSupported,
    recentPhrases,
    getRecentTranscript,
  } = useSpeechRecognition({ enabled: speechEnabled });

  const handleTimeUp = useCallback(() => {
    toast.info("O tempo da reunião de 30 minutos acabou.");
    leavingRef.current = true;
    setTimeout(() => onLeave(), 1500);
  }, [onLeave]);

  // Listen for room disconnection
  useEffect(() => {
    const handleDisconnected = (reason?: DisconnectReason) => {
      if (leavingRef.current) return;
      if (reason === DisconnectReason.CLIENT_INITIATED) return;
      if (!shouldLeaveOnDisconnect(reason)) {
        toast.warning("A conexão oscilou, mas a reunião continuará ativa quando a reconexão terminar.");
        return;
      }
      toast.info("A reunião foi encerrada");
      onLeave();
    };
    room.on(RoomEvent.Disconnected, handleDisconnected);
    return () => { room.off(RoomEvent.Disconnected, handleDisconnected); };
  }, [room, onLeave]);

  // Mark leaving + translate LiveKit UI elements to pt-BR
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Patch leave button
      const leaveBtn = document.querySelector('.lk-disconnect-button');
      if (leaveBtn && !leaveBtn.getAttribute('data-patched')) {
        leaveBtn.setAttribute('data-patched', 'true');
        leaveBtn.addEventListener('click', () => {
          leavingRef.current = true;
          setTimeout(() => onLeave(), 500);
        }, { once: true });
      }

      // Translate chat input placeholder
      const chatInput = document.querySelector('.lk-chat-form-input') as HTMLInputElement;
      if (chatInput && chatInput.placeholder !== 'Digite uma mensagem...') {
        chatInput.placeholder = 'Digite uma mensagem...';
      }

      // Translate "Send" button
      const sendBtn = document.querySelector('.lk-chat-form-button');
      if (sendBtn && sendBtn.textContent?.trim() === 'Send') {
        sendBtn.textContent = 'Enviar';
      }

      // Inject file upload button next to chat input if not already there
      const chatForm = document.querySelector('.lk-chat-form');
      if (chatForm && !chatForm.querySelector('[data-file-btn]')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-file-btn', 'true');
        btn.className = 'lk-button lk-chat-form-button';
        btn.style.cssText = 'padding: 4px 8px; min-width: auto; order: -1;';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
        btn.title = 'Enviar arquivo';
        btn.addEventListener('click', () => {
          fileInputRef.current?.click();
        });
        chatForm.insertBefore(btn, chatForm.firstChild);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [onLeave]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const metadata = JSON.stringify({
        type: 'file',
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      // Send file metadata as a chat message
      const encoder = new TextEncoder();
      const metaBytes = encoder.encode(metadata);

      // Combine metadata length (4 bytes) + metadata + file data
      const header = new Uint8Array(4);
      new DataView(header.buffer).setUint32(0, metaBytes.length);
      const combined = new Uint8Array(header.length + metaBytes.length + arrayBuffer.byteLength);
      combined.set(header, 0);
      combined.set(metaBytes, 4);
      combined.set(new Uint8Array(arrayBuffer), 4 + metaBytes.length);

      await room.localParticipant.publishData(combined, {
        reliable: true,
        topic: 'file-share',
      });

      toast.success(`Arquivo "${file.name}" enviado!`);
    } catch (err) {
      toast.error("Erro ao enviar arquivo");
      console.error("File send error:", err);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [room]);

  const copyLink = () => {
    const link = `${window.location.origin}/meetings/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <div className="flex flex-col bg-[#111] text-white overflow-hidden lk-meeting-container notranslate" translate="no" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 bg-[#1a1a1a] border-b border-white/10 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold truncate">{meetingTitle}</span>
          {isHost && (
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              Anfitrião
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MeetingTimer startedAt={startedAt} onTimeUp={handleTimeUp} />
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setShowSettings(true)}>
            <Settings className="w-3.5 h-3.5" /> Configurações
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-white/70 hover:text-white hover:bg-white/10" onClick={copyLink}>
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        <VideoConference />
        <FloatingParticipants />
        {isHost && <WaitingRoomNotifications meetingId={meetingId} />}
        {isHost && (
          <SalesMentorPanel
            meetingTitle={meetingTitle}
            liveTranscript={getRecentTranscript(120)}
          />
        )}
        <MeetingTranslationPanel
          isListening={isListening}
          recentPhrases={recentPhrases}
          onToggleListening={() => setSpeechEnabled((v) => !v)}
          isSupported={isSupported}
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
      />

      <MeetingSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
};

const MeetingRoomView = ({ token, serverUrl, meetingTitle, isHost, roomId, meetingId, onLeave }: Props) => {
  const roomOptions = useMemo(
    () => ({
      disconnectOnPageLeave: false,
    }),
    []
  );

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      options={roomOptions}
      onDisconnected={() => {}}
      onError={(e) => {
        console.error("LiveKit error:", e);
        toast.error("Erro na conexão da reunião");
      }}
      data-lk-theme="default"
      style={{ height: "100dvh" }}
    >
      <MeetingInner
        meetingTitle={meetingTitle}
        isHost={isHost}
        roomId={roomId}
        meetingId={meetingId}
        onLeave={onLeave}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

export default MeetingRoomView;
