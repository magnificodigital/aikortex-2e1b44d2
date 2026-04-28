import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePartnerTier } from "@/hooks/use-partner-tier";
import { TIER_FEATURE_CONFIG, type FeatureFlag } from "@/types/rbac";
import { TIER_CONFIG } from "@/types/partner";

interface FeatureGateProps {
  feature: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}

const FeatureGate = ({ feature, children, fallback }: FeatureGateProps) => {
  const navigate = useNavigate();
  const { hasFeature, getMinTierForFeature, isLoading } = usePartnerTier();

  if (isLoading) return null;

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  const minTier = getMinTierForFeature(feature);
  const tierLabel = minTier ? TIER_CONFIG[minTier]?.label ?? minTier : "Superior";
  const tierColor = minTier ? TIER_CONFIG[minTier]?.color ?? "" : "";

  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none blur-sm opacity-30">
        {children}
      </div>

      {/* Overlay card */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="max-w-sm w-full border-border/50 shadow-xl bg-card/95 backdrop-blur">
          <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Funcionalidade bloqueada</h3>
              <p className="text-sm text-muted-foreground">
                Esta funcionalidade está disponível a partir do tier{" "}
                <span className={`font-semibold ${tierColor}`}>{tierLabel}</span>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/partners?tab=tiers")}
              className="gap-2"
            >
              Ver como evoluir
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeatureGate;
