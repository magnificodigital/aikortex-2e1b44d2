import { Bot, Brain, Cpu, Eye, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const agents = [
  { name: "Atlas", role: "Research Synthesis", load: 78, status: "active", icon: Brain },
  { name: "Helix", role: "Code Generation", load: 92, status: "active", icon: Cpu },
  { name: "Vega", role: "Vision Analysis", load: 41, status: "idle", icon: Eye },
  { name: "Nova", role: "Conversational", load: 64, status: "active", icon: MessageCircle },
  { name: "Echo", role: "Data Extraction", load: 12, status: "idle", icon: Bot },
];

export function AgentsPanel() {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Active Agents</h3>
          <p className="text-xs text-muted-foreground">Real-time cortex processes</p>
        </div>
        <button className="text-xs text-primary hover:text-primary-foreground transition-smooth">View all →</button>
      </div>
      <div className="space-y-3">
        {agents.map((a) => (
          <div
            key={a.name}
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/40 p-3 transition-smooth hover:border-primary/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{a.name}</span>
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      a.status === "active" ? "bg-[hsl(var(--success))] animate-pulse-glow" : "bg-muted-foreground"
                    )}
                  />
                  {a.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{a.role}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-primary"
                  style={{ width: `${a.load}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
