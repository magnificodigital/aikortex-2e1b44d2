import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Mic,
  Video,
  Volume2,
} from "lucide-react";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MeetingSettingsDialog = ({ open, onOpenChange }: Props) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);

  const [selectedMic, setSelectedMic] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");

  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [mirrorVideo, setMirrorVideo] = useState(true);

  // Enumerate devices
  useEffect(() => {
    if (!open) return;

    const enumerate = async () => {
      try {
        // Need permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((s) => {
          s.getTracks().forEach((t) => t.stop());
        }).catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();

        const mics = devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microfone ${i + 1}` }));
        const speakers = devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Alto-falante ${i + 1}` }));
        const cameras = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Câmera ${i + 1}` }));

        setAudioInputs(mics);
        setAudioOutputs(speakers);
        setVideoInputs(cameras);

        if (mics.length && !selectedMic) setSelectedMic(mics[0].deviceId);
        if (speakers.length && !selectedSpeaker) setSelectedSpeaker(speakers[0].deviceId);
        if (cameras.length && !selectedCamera) setSelectedCamera(cameras[0].deviceId);
      } catch (e) {
        console.error("Failed to enumerate devices:", e);
      }
    };

    enumerate();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="w-5 h-5 text-primary" /> Configurações
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="w-full bg-white/5 border border-white/10">
            <TabsTrigger value="audio" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
              <Mic className="w-3.5 h-3.5 mr-1.5" /> Áudio
            </TabsTrigger>
            <TabsTrigger value="video" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
              <Video className="w-3.5 h-3.5 mr-1.5" /> Vídeo
            </TabsTrigger>
          </TabsList>

          {/* Audio Tab */}
          <TabsContent value="audio" className="mt-4 space-y-5">
            {/* Microphone selector */}
            <div className="space-y-2">
              <Label className="text-sm text-white flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-white/60" /> Microfone
              </Label>
              <Select value={selectedMic} onValueChange={setSelectedMic}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue placeholder="Selecione um microfone" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {audioInputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId} className="text-white text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speaker selector */}
            <div className="space-y-2">
              <Label className="text-sm text-white flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-white/60" /> Alto-falante
              </Label>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue placeholder="Selecione um alto-falante" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {audioOutputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId} className="text-white text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio toggles */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-white">Supressão de ruído</Label>
                  <p className="text-[10px] text-white/40">Remove ruídos de fundo</p>
                </div>
                <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-white">Cancelamento de eco</Label>
                  <p className="text-[10px] text-white/40">Evita feedback de áudio</p>
                </div>
                <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
              </div>
            </div>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="mt-4 space-y-5">
            {/* Camera selector */}
            <div className="space-y-2">
              <Label className="text-sm text-white flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-white/60" /> Câmera
              </Label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue placeholder="Selecione uma câmera" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {videoInputs.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId} className="text-white text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video toggles */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-white">Espelhar vídeo</Label>
                  <p className="text-[10px] text-white/40">Inverte horizontalmente sua câmera</p>
                </div>
                <Switch checked={mirrorVideo} onCheckedChange={setMirrorVideo} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSettingsDialog;
