import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Meeting {
  id: string;
  title: string;
  room_id: string;
  host_user_id: string;
  status: "waiting" | "active" | "ended";
  settings: {
    waiting_room: boolean;
    chat_enabled: boolean;
    screen_share_enabled: boolean;
  };
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("host_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setMeetings(data as unknown as Meeting[]);
    setLoading(false);
  }, []);

  const createMeeting = useCallback(async (title: string, settings?: Partial<Meeting["settings"]>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title,
        host_user_id: user.id,
        settings: {
          waiting_room: false,
          chat_enabled: true,
          screen_share_enabled: true,
          ...settings,
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Meeting;
  }, []);

  const endMeeting = useCallback(async (meetingId: string) => {
    const { error } = await supabase
      .from("meetings")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", meetingId);
    if (error) throw error;
  }, []);

  const getMeetingByRoomId = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("room_id", roomId)
      .single();
    if (error) throw error;
    return data as unknown as Meeting;
  }, []);

  const deleteMeeting = useCallback(async (meetingId: string) => {
    const { error } = await supabase
      .from("meetings")
      .delete()
      .eq("id", meetingId);
    if (error) throw error;
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  }, []);

  return { meetings, loading, fetchMeetings, createMeeting, endMeeting, deleteMeeting, getMeetingByRoomId };
}
