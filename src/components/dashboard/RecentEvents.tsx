import { CheckCircle2, AlertTriangle, GitBranch, Sparkles } from "lucide-react";

const events = [
  { icon: Sparkles, color: "text-primary", title: "Atlas completed inference batch", time: "2m ago", meta: "1,284 tokens" },
  { icon: GitBranch, color: "text-accent", title: "New model deployed: kortex-v3.2", time: "14m ago", meta: "production" },
  { icon: CheckCircle2, color: "text-[hsl(var(--success))]", title: "Dataset 'support-logs' indexed", time: "38m ago", meta: "84.2k rows" },
  { icon: AlertTriangle, color: "text-[hsl(var(--warning))]", title: "Rate limit approaching on Helix", time: "1h ago", meta: "92% capacity" },
  { icon: Sparkles, color: "text-primary", title: "Vega processed 412 images", time: "3h ago", meta: "vision pipeline" },
];

export function RecentEvents() {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Recent Events</h3>
        <p className="text-xs text-muted-foreground">System & agent activity log</p>
      </div>
      <div className="space-y-1">
        {events.map((e, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg p-2.5 transition-smooth hover:bg-secondary/60"
          >
            <e.icon className={`mt-0.5 h-4 w-4 shrink-0 ${e.color}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{e.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{e.time}</span>
                <span>·</span>
                <span className="font-mono">{e.meta}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
