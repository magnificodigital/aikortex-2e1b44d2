import { Clock, AlertTriangle, UserPlus, MessageSquare, Handshake } from "lucide-react";

const notifications = [
  { icon: Clock, text: "Prazo: Deploy chatbot em 2h", type: "deadline", time: "Agora" },
  { icon: AlertTriangle, text: "Automação Welcome Flow falhou", type: "error", time: "5 min" },
  { icon: UserPlus, text: "3 novos leads capturados", type: "lead", time: "12 min" },
  { icon: MessageSquare, text: "Nova mensagem de TechCorp", type: "message", time: "20 min" },
  { icon: Handshake, text: "Partner solicitou acesso", type: "partner", time: "1h" },
];

const typeColors: Record<string, string> = {
  deadline: "text-[hsl(var(--warning))]",
  error: "text-destructive",
  lead: "text-[hsl(var(--success))]",
  message: "text-[hsl(var(--info))]",
  partner: "text-primary",
};

const NotificationsCenter = () => (
  <div className="glass-card flex flex-col h-full">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
      <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">5</span>
    </div>
    <div className="flex-1 overflow-y-auto p-2">
      {notifications.map((n, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
          <n.icon className={`w-4 h-4 shrink-0 ${typeColors[n.type]}`} />
          <p className="text-xs text-foreground flex-1 truncate">{n.text}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
        </div>
      ))}
    </div>
  </div>
);

export default NotificationsCenter;
