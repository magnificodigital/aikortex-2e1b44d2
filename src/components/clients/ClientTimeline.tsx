import { CheckSquare, MessageSquare, Zap, Phone, UserPlus, FileText, DollarSign } from "lucide-react";
import { TimelineEvent, MOCK_TIMELINE } from "@/types/client";

const iconMap: Record<TimelineEvent["type"], React.ElementType> = {
  task: CheckSquare,
  message: MessageSquare,
  automation: Zap,
  call: Phone,
  lead: UserPlus,
  contract: FileText,
  payment: DollarSign,
};

const colorMap: Record<TimelineEvent["type"], string> = {
  task: "bg-primary/15 text-primary",
  message: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
  automation: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  call: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
  lead: "bg-primary/15 text-primary",
  contract: "bg-secondary text-secondary-foreground",
  payment: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
};

const ClientTimeline = () => {
  return (
    <div className="space-y-1">
      {MOCK_TIMELINE.map((event, i) => {
        const Icon = iconMap[event.type];
        return (
          <div key={event.id} className="flex gap-3 py-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {i < MOCK_TIMELINE.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{event.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientTimeline;
