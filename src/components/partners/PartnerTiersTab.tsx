import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TIER_CONFIG, type PartnerTier } from "@/types/partner";
import { TIER_FEATURE_CONFIG, FEATURE_FLAG_LABELS, type FeatureFlag } from "@/types/rbac";
import { usePartnerTier } from "@/hooks/use-partner-tier";
import { Award, Check, Lock, ChevronRight, Users, DollarSign, Package, GraduationCap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const tiers: PartnerTier[] = ["starter", "explorer", "hack"];
const allFeatures = Object.keys(FEATURE_FLAG_LABELS) as FeatureFlag[];

const PartnerTiersTab = () => {
  const { tier, data, isLoading, nextTier, progressToNextTier, updateMetrics } = usePartnerTier();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [formMetrics, setFormMetrics] = useState({
    clients_served: 0,
    revenue: 0,
    solutions_published: 0,
    certifications_earned: 0,
  });

  const currentIdx = tiers.indexOf(tier);

  const openUpdateModal = () => {
    setFormMetrics({
      clients_served: data?.clients_served ?? 0,
      revenue: Number(data?.revenue ?? 0),
      solutions_published: data?.solutions_published ?? 0,
      certifications_earned: data?.certifications_earned ?? 0,
    });
    setShowUpdateModal(true);
  };

  const handleSaveMetrics = () => {
    updateMetrics.mutate(formMetrics, {
      onSuccess: () => {
        toast.success("Métricas atualizadas!");
        setShowUpdateModal(false);
      },
      onError: () => toast.error("Erro ao atualizar métricas"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getProgress = (t: PartnerTier) => {
    const cfg = TIER_CONFIG[t];
    return [
      { current: data?.clients_served ?? 0, required: cfg.minClients, label: "Clientes", icon: Users },
      { current: Number(data?.revenue ?? 0), required: cfg.minRevenue, label: "Receita (R$)", icon: DollarSign },
      { current: data?.solutions_published ?? 0, required: cfg.minSolutions, label: "Soluções", icon: Package },
      { current: data?.certifications_earned ?? 0, required: cfg.minCerts, label: "Certificações", icon: GraduationCap },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Section 1 — Current tier + metrics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center`}>
                <Award className={`w-6 h-6 ${TIER_CONFIG[tier].color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Seu Tier</CardTitle>
                  <Badge variant="outline" className={`${TIER_CONFIG[tier].color} border-current/20 text-sm`}>
                    {TIER_CONFIG[tier].label}
                  </Badge>
                </div>
                {nextTier && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Próximo nível: <span className={TIER_CONFIG[nextTier].color}>{TIER_CONFIG[nextTier].label}</span>
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openUpdateModal}>
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar métricas
            </Button>
          </div>
        </CardHeader>
        {nextTier && progressToNextTier && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Clientes", current: data?.clients_served ?? 0, target: TIER_CONFIG[nextTier].minClients, pct: progressToNextTier.clients, icon: Users },
                { label: "Faturamento", current: `R$ ${Number(data?.revenue ?? 0).toLocaleString("pt-BR")}`, target: `R$ ${TIER_CONFIG[nextTier].minRevenue.toLocaleString("pt-BR")}`, pct: progressToNextTier.revenue, icon: DollarSign },
                { label: "Soluções", current: data?.solutions_published ?? 0, target: TIER_CONFIG[nextTier].minSolutions, pct: progressToNextTier.solutions, icon: Package },
                { label: "Certificações", current: data?.certifications_earned ?? 0, target: TIER_CONFIG[nextTier].minCerts, pct: progressToNextTier.certs, icon: GraduationCap },
              ].map((m) => (
                <Card key={m.label} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <m.icon className="w-3.5 h-3.5" /> {m.label}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{m.current} <span className="text-muted-foreground font-normal">/ {m.target}</span></p>
                    <Progress value={m.pct} className="h-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section 2 — Tier timeline + cards */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {tiers.map((t, i) => {
              const cfg = TIER_CONFIG[t];
              const reached = i <= currentIdx;
              return (
                <div key={t} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${reached ? "border-primary bg-primary/10" : "border-muted bg-muted/30"}`}>
                      {reached ? <Check className={`w-5 h-5 ${cfg.color}`} /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${reached ? cfg.color : "text-muted-foreground"}`}>{cfg.label}</span>
                  </div>
                  {i < tiers.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiers.map((t, i) => {
          const cfg = TIER_CONFIG[t];
          const reached = i <= currentIdx;
          const isNext = i === currentIdx + 1;
          const metrics = getProgress(t);

          return (
            <Card key={t} className={`${isNext ? "border-primary/50 ring-1 ring-primary/20" : ""} ${reached && !isNext ? "opacity-80" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className={`w-5 h-5 ${cfg.color}`} />
                    <CardTitle className="text-base">{cfg.label}</CardTitle>
                  </div>
                  {reached && <Badge variant="secondary" className="text-xs">Conquistado</Badge>}
                  {isNext && <Badge className="text-xs">Próximo nível</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.filter((m) => m.required > 0).map((m) => {
                  const pct = Math.min(100, (m.current / m.required) * 100);
                  return (
                    <div key={m.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <m.icon className="w-3 h-3" />{m.label}
                        </span>
                        <span className="text-foreground font-medium">{m.current}/{m.required}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}

                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-foreground mb-1">Benefícios:</p>
                  <ul className="space-y-1">
                    {cfg.benefits.map((b) => (
                      <li key={b} className="text-xs text-muted-foreground flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-primary shrink-0" />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section 3 — Feature matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funcionalidades por Tier</CardTitle>
          <p className="text-xs text-muted-foreground">Veja quais recursos você já tem acesso e o que estará disponível conforme você avança</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Funcionalidade</th>
                  {tiers.map((t) => (
                    <th key={t} className={`text-center py-2 px-3 text-xs font-medium ${t === tier ? TIER_CONFIG[t].color + " font-bold" : "text-muted-foreground"}`}>
                      {TIER_CONFIG[t].label}
                      {t === tier && <span className="block text-[10px]">(Atual)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allFeatures.map((f) => (
                  <tr key={f} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-xs text-foreground">{FEATURE_FLAG_LABELS[f]}</td>
                    {tiers.map((t) => {
                      const has = TIER_FEATURE_CONFIG[t]?.features?.includes(f);
                      const isCurrent = tiers.indexOf(t) <= currentIdx;
                      return (
                        <td key={t} className="text-center py-2.5 px-3">
                          {has ? (
                            <Check className={`w-4 h-4 mx-auto ${isCurrent ? "text-green-500" : "text-muted-foreground/50"}`} />
                          ) : (
                            <Lock className="w-3.5 h-3.5 mx-auto text-muted-foreground/30" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Update Metrics Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Métricas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Clientes atendidos</Label>
              <Input type="number" value={formMetrics.clients_served} onChange={(e) => setFormMetrics(prev => ({ ...prev, clients_served: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Faturamento (R$)</Label>
              <Input type="number" value={formMetrics.revenue} onChange={(e) => setFormMetrics(prev => ({ ...prev, revenue: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Soluções publicadas</Label>
              <Input type="number" value={formMetrics.solutions_published} onChange={(e) => setFormMetrics(prev => ({ ...prev, solutions_published: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Certificações obtidas</Label>
              <Input type="number" value={formMetrics.certifications_earned} onChange={(e) => setFormMetrics(prev => ({ ...prev, certifications_earned: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveMetrics} disabled={updateMetrics.isPending}>
              {updateMetrics.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerTiersTab;
