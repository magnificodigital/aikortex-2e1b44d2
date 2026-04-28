import { Activity, Bot, Cpu, Zap } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { AgentsPanel } from "@/components/dashboard/AgentsPanel";
import { RecentEvents } from "@/components/dashboard/RecentEvents";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in-up">
            {/* Hero header */}
            <section className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 md:p-8">
              <div className="absolute inset-0 bg-grid opacity-30" />
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                    Cortex v3.2 · Live
                  </span>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                    Welcome back, <span className="text-gradient">Alex</span>
                  </h1>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Your neural cortex processed <span className="text-foreground font-medium">12,460 inferences</span> today across 5 agents. Performance is up 18.4% week-over-week.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border bg-secondary/60 px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-secondary">
                    View report
                  </button>
                  <button className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition-smooth hover:shadow-neon">
                    Deploy agent
                  </button>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Inferences" value="12,460" change={18.4} icon={Zap} accent="primary" />
              <StatCard label="Active Agents" value="5 / 8" change={4.2} icon={Bot} accent="violet" />
              <StatCard label="Avg Latency" value="142ms" change={-9.1} icon={Activity} accent="primary" />
              <StatCard label="GPU Usage" value="76%" change={12.6} icon={Cpu} accent="violet" />
            </section>

            {/* Main grid */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <ActivityChart />
                <RecentEvents />
              </div>
              <div>
                <AgentsPanel />
              </div>
            </section>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
