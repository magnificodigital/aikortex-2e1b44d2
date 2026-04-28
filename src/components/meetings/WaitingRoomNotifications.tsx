import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface WaitingGuest {
  id: string;
  guest_id: string;
  display_name: string;
  status: string;
  created_at: string;
}

interface Props {
  meetingId: string;
}

const WaitingRoomNotifications = ({ meetingId }: Props) => {
  const [guests, setGuests] = useState<WaitingGuest[]>([]);

  const fetchWaiting = useCallback(async () => {
    const { data } = await supabase
      .from("meeting_waiting_room" as any)
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("status", "waiting") as any;
    if (data) setGuests(data);
  }, [meetingId]);

  useEffect(() => {
    fetchWaiting();

    const channel = supabase
      .channel(`host-waiting-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_waiting_room",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload: any) => {
          const guest = payload.new as WaitingGuest;
          if (guest.status === "waiting") {
            setGuests((prev) => [...prev, guest]);
            toast.info(`${guest.display_name} está na sala de espera`, {
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchWaiting]);

  const handleAction = async (guestId: string, action: "approved" | "rejected") => {
    await supabase
      .from("meeting_waiting_room" as any)
      .update({ status: action, updated_at: new Date().toISOString() } as any)
      .eq("id", guestId);

    setGuests((prev) => prev.filter((g) => g.id !== guestId));

    const guest = guests.find((g) => g.id === guestId);
    if (action === "approved") {
      toast.success(`${guest?.display_name} foi autorizado a entrar`);
    } else {
      toast.info(`${guest?.display_name} teve a entrada recusada`);
    }
  };

  if (guests.length === 0) return null;

  return (
    <div className="absolute top-14 right-4 z-50 space-y-2 max-w-xs">
      {guests.map((guest) => (
        <div
          key={guest.id}
          className="bg-[#1a1a1a] border border-white/20 rounded-lg p-3 shadow-xl animate-in slide-in-from-right"
        >
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-sm text-white font-medium truncate">
              {guest.display_name}
            </span>
          </div>
          <p className="text-xs text-white/60 mb-3">Solicitando entrada na reunião</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => handleAction(guest.id, "approved")}
            >
              <Check className="w-3 h-3" /> Autorizar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => handleAction(guest.id, "rejected")}
            >
              <X className="w-3 h-3" /> Recusar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WaitingRoomNotifications;
