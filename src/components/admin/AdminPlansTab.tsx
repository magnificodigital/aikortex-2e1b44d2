import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TierAccessManager from "@/components/admin/TierAccessManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Rocket, Zap, Check, X, Users, RefreshCw, ShieldCheck, LayoutGrid } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean | null;
  is_featured: boolean | null;
  features: any;
}

const TIER_VISUAL: Record<string, { icon: React.ReactNode; badge: string; badgeClass: string; unlock: string }> = {
  starter: {
    icon: <Users className="w-5 h-5" />,
    badge: "Starter",
    badgeClass: "bg-muted text-muted-foreground",
    unlock: "Disponível ao se cadastrar",
  },
  explorer: {
    icon: <Rocket className="w-5 h-5" />,
    badge: "Explorer",
    badgeClass: "bg-blue-500/10 text-blue-600",
    unlock: "Desbloqueado com 5 clientes ativos",
  },
  hack: {
    icon: <Crown className="w-5 h-5" />,
    badge: "Hack",
    badgeClass: "bg-purple-500/10 text-purple-600",
    unlock: "Desbloqueado com 15 clientes ativos",
  },
};

const FEATURE_LABELS: Record<string, string> = {
  clients: "Clientes",
  agents_per_client: "Agentes por cliente",
  channels: "Canais",
  flow_builder: "Flow Builder",
  app_builder: "App Builder",
  voice_calls: "Chamadas de voz",
  white_label: "White-label",
  custom_domain: "Domínio customizado",
  priority_support: "Suporte prioritário",
  training: "Treinamento mensal",
  exclusive_templates: "Templates exclusivos",
};

const AdminPlansTab = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("price_monthly");
    setPlans((data as Plan[]) || []);
    setLoading(false);
  };

  const renderFeatureValue = (key: string, value: any) => {
    if (typeof value === "boolean") {
      return value
        ? <Check className="w-4 h-4 text-emerald-500" />
        : <X className="w-4 h-4 text-muted-foreground/40" />;
    }
    if (Array.isArray(value)) {
      return <span className="text-sm text-muted-foreground">{value.join(", ")}</span>;
    }
    if (value === "ilimitado" || value === "all") {
      return <Badge variant="outline" className="text-xs">Ilimitado</Badge>;
    }
    return <span className="text-sm">{String(value)}</span>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="permissions" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Permissões por Tier
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            Planos
          </TabsTrigger>
        </TabsList>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <TierAccessManager />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Planos da Plataforma</h3>
                <p className="text-sm text-muted-foreground">
                  Todos os planos são gratuitos — agências sobem de tier ao conquistar clientes ativos.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchPlans}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Atualizar
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando planos...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const tier = TIER_VISUAL[plan.slug] || TIER_VISUAL.starter;
                  const features = plan.features || {};
                  const templates = features.templates;

                  return (
                    <Card key={plan.id} className={plan.is_featured ? "border-purple-500/50 shadow-md" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tier.icon}
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                          </div>
                          <Badge className={tier.badgeClass}>{tier.badge}</Badge>
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                        <div className="pt-2">
                          <span className="text-2xl font-bold">Gratuito</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-muted-foreground">{tier.unlock}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Funcionalidades</p>
                          {Object.entries(features).map(([key, value]) => {
                            if (key === "templates" || key === "max_tier") return null;
                            const label = FEATURE_LABELS[key] || key;
                            return (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span>{label}</span>
                                {renderFeatureValue(key, value)}
                              </div>
                            );
                          })}
                        </div>

                        {templates && (
                          <div className="space-y-1.5 pt-2 border-t">
                            <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Templates</p>
                            {templates === "all" ? (
                              <Badge variant="outline" className="text-xs">Todos os templates</Badge>
                            ) : Array.isArray(templates) ? (
                              <div className="flex flex-wrap gap-1">
                                {templates.map((t: string) => (
                                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPlansTab;
