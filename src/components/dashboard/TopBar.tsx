import { Search, Bell, Command } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden md:flex relative max-w-md flex-1 items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search agents, datasets, conversations…"
          className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <kbd className="absolute right-3 hidden items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:flex">
          <Command className="h-3 w-3" /> K
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground transition-smooth hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 py-1 pl-1 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary text-xs font-bold text-primary-foreground">
            AK
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-medium leading-tight text-foreground">Alex Kortex</p>
            <p className="text-[10px] leading-tight text-muted-foreground">Pro plan</p>
          </div>
        </div>
      </div>
    </header>
  );
}
