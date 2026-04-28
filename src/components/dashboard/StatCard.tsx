import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  icon: LucideIcon;
  accent?: "primary" | "violet";
}

export function StatCard({ label, value, change, icon: Icon, accent = "primary" }: StatCardProps) {
  const positive = change >= 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-card p-5 transition-smooth hover:border-primary/40 hover:shadow-elegant">
      <div
        className={cn(
          "absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl opacity-30 transition-smooth group-hover:opacity-60",
          accent === "primary" ? "bg-primary" : "bg-accent"
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {positive ? (
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={positive ? "text-[hsl(var(--success))]" : "text-destructive"}>
              {positive ? "+" : ""}
              {change}%
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border",
            accent === "primary"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-accent/30 bg-accent/10 text-accent"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
