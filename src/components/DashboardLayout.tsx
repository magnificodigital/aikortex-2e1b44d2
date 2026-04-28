import { ReactNode, useCallback, useEffect, useState } from "react";
import { Menu, X, AlertTriangle, Key, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { RightPanelProvider } from "./RightPanel";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMonthlyUsage } from "@/hooks/use-monthly-usage";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const handleMobileClose = useCallback(() => setMobileSidebarOpen(false), []);
  const { messageCount, monthlyLimit, isNearLimit, hasByok, planSlug } = useMonthlyUsage();
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem("usage-banner-dismissed") === "true"
  );

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("usage-banner-dismissed", "true");
  };

  const showBanner = isNearLimit && !hasByok && !bannerDismissed;

  return (
    <RightPanelProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
        <main className="relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-background">
          {showBanner && (
            <div className="sticky top-0 z-40 flex items-center gap-3 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="flex-1 text-foreground">
                Você usou {Math.round((messageCount / monthlyLimit) * 100)}% das mensagens do seu plano este mês ({messageCount}/{monthlyLimit}). Configure uma chave de API para uso ilimitado.
              </span>
              <Button size="sm" variant="default" className="shrink-0 text-xs gap-1.5" onClick={() => navigate("/settings?tab=integrations")}>
                <Key className="w-3 h-3" /> Configurar chave
              </Button>
              <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1.5" onClick={() => navigate("/pricing")}>
                <TrendingUp className="w-3 h-3" /> Fazer upgrade
              </Button>
              <button onClick={dismissBanner} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {isMobile && (
            <div className="sticky top-0 z-30 flex items-center justify-between bg-background/80 backdrop-blur-lg px-3 py-2">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div />
            </div>
          )}

          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute -top-[10%] -right-[5%] h-[500px] w-[500px] animate-[mesh-move_20s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.4),transparent_70%)] opacity-[0.08] blur-[120px] dark:opacity-[0.15]" />
            <div className="absolute -bottom-[5%] -left-[5%] h-[400px] w-[400px] animate-[mesh-move-alt_25s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,hsl(var(--info)/0.3),transparent_70%)] opacity-[0.06] blur-[100px] dark:opacity-[0.12]" />
            <div className="absolute top-[40%] left-[50%] -ml-[150px] h-[300px] w-[300px] animate-[mesh-move-slow_30s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.2),transparent_70%)] opacity-[0.05] blur-[100px] dark:opacity-[0.10]" />
          </div>

          <div className="space-stars" />
          <div className="space-stars-layer2" />
          <div className="space-stars-layer3" />

          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </RightPanelProvider>
  );
};

export default DashboardLayout;
