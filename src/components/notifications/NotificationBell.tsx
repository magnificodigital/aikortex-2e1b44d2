import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeColors: Record<string, string> = {
  success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  error: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="w-3 h-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.is_read ? "bg-accent/30" : ""}`}
              onClick={() => {
                if (!n.is_read) markAsRead.mutate(n.id);
                if (n.action_url) navigate(n.action_url);
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[n.type] || ""}`}>
                  {n.type === "success" ? "✓" : n.type === "warning" ? "⚠" : n.type === "error" ? "✕" : "ℹ"}
                </Badge>
                <span className="text-sm font-medium text-foreground truncate flex-1">{n.title}</span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
              <span className="text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
