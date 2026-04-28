import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModuleGate from "@/components/shared/ModuleGate";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Plus, Copy, ExternalLink, Clock, Users, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMeetings, type Meeting } from "@/hooks/use-meetings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Meetings = () => {
  const navigate = useNavigate();
  const { meetings, loading, fetchMeetings, createMeeting, deleteMeeting } = useMeetings();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const meeting = await createMeeting(title || "Reunião", {
        waiting_room: waitingRoom,
        chat_enabled: chatEnabled,
        screen_share_enabled: screenShareEnabled,
      });
      toast.success("Reunião criada!");
      setShowCreate(false);
      setTitle("");
      navigate(`/meetings/${meeting.room_id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar reunião");
    } finally {
      setCreating(false);
    }
  };

  const handleInstantMeeting = async () => {
    setCreating(true);
    try {
      const meeting = await createMeeting("Reunião Rápida");
      navigate(`/meetings/${meeting.room_id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar reunião");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByLink = () => {
    if (!joinLink.trim()) return;
    // Extract room ID from link or use as-is
    const parts = joinLink.trim().split("/");
    const roomId = parts[parts.length - 1] || joinLink.trim();
    navigate(`/meetings/${roomId}`);
  };

  const copyLink = (roomId: string) => {
    const link = `${window.location.origin}/meetings/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      waiting: { label: "Aguardando", variant: "secondary" },
      active: { label: "Ativa", variant: "default" },
      ended: { label: "Encerrada", variant: "destructive" },
    };
    const s = map[status] || map.waiting;
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const filtered = meetings.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModuleGate moduleKey="gestao.reunioes">
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reuniões</h1>
              <p className="text-sm text-muted-foreground">Videoconferências em tempo real</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Reunião
            </Button>
            <Button onClick={handleInstantMeeting} disabled={creating} className="gap-2">
              <Video className="w-4 h-4" /> Reunião Instantânea
            </Button>
          </div>
        </div>

        {/* Join by link */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
              placeholder="Cole um link ou ID da reunião para entrar"
              className="pl-9"
              onKeyDown={(e) => e.key === "Enter" && handleJoinByLink()}
            />
          </div>
          <Button variant="outline" onClick={handleJoinByLink} disabled={!joinLink.trim()}>
            Entrar
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar reuniões..."
            className="pl-9"
          />
        </div>

        {/* Meetings list */}
        <div className="border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Carregando...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma reunião encontrada</h3>
              <p className="text-xs text-muted-foreground">Crie sua primeira reunião para começar.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y divide-border">
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => m.status !== "ended" && navigate(`/meetings/${m.room_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(m.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(m.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); copyLink(m.room_id); }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteMeeting(m.id);
                            toast.success("Reunião excluída");
                          } catch {
                            toast.error("Erro ao excluir reunião");
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Nova Reunião
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome da reunião</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião semanal de equipe"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Configurações</Label>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Sala de espera</Label>
                <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Chat habilitado</Label>
                <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Compartilhar tela</Label>
                <Switch checked={screenShareEnabled} onCheckedChange={setScreenShareEnabled} />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleCreate} disabled={creating}>
              <Video className="w-4 h-4" /> Criar Reunião
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </ModuleGate>
  );
};

export default Meetings;
