import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
