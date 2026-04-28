import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  meetingId: string;
  guestId: string;
  displayName: string;
  meetingTitle: string;
  onApproved: () => void;
  onRejected: () => void;
}

const WaitingRoom = ({ meetingId, guestId, displayName, meetingTitle, onApproved, onRejected }: Props) => {
  const [status, setStatus] = useState<"waiting" | "approved" | "rejected">("waiting");

  useEffect(() => {
    // Insert waiting room entry
    const insertEntry = async () => {
      await supabase.from("meeting_waiting_room" as any).insert({
        meeting_id: meetingId,
        guest_id: guestId,
        display_name: displayName,
        status: "waiting",
      } as any);
    };
    insertEntry();

    // Subscribe to changes
    const channel = supabase
      .channel(`waiting-${guestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meeting_waiting_room",
          filter: `guest_id=eq.${guestId}`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status;
          if (newStatus === "approved") {
            setStatus("approved");
            onApproved();
          } else if (newStatus === "rejected") {
            setStatus("rejected");
            onRejected();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, guestId, displayName, onApproved, onRejected]);

  if (status === "rejected") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Entrada não autorizada</h2>
          <p className="text-sm text-muted-foreground">
            O anfitrião não autorizou sua entrada nesta reunião.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Sala de espera</h2>
        <p className="text-sm text-muted-foreground">
          Aguardando o anfitrião autorizar sua entrada em <strong>{meetingTitle}</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Você está identificado como <strong>{displayName}</strong>
        </p>
      </div>
    </div>
  );
};

export default WaitingRoom;
