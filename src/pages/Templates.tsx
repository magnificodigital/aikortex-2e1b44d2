import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Search, Lock, ExternalLink, Settings, Bot, Workflow, AppWindow, Trophy,
  ArrowRight, CheckCircle2,
} from "lucide-react";

type Template = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  demo_url: string | null;
  features: string[];
  platform_price_monthly: number;
  min_tier: string;
  is_exclusive: boolean | null;
  sort_order: number | null;
};

type AgencyProfile = {
  id: string;
  tier: string;
  active_clients_count: number | null;
  custom_pricing: Record<string, number> | null;
};

const TIER_ORDER: Record<string, number> = { starter: 0, explorer: 1, hack: 2 };
const TIER_LABELS: Record<string, string> = { starter: "Starter", explorer: "Explorer", hack: "Hack" };
const TIER_COLORS: Record<string, string> = {
  starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  explorer: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  hack: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};
const CATEGORY_ICONS: Record<string, typeof Bot> = { agent: Bot, automation: Workflow, app: AppWindow };
const CATEGORY_LABELS: Record<string, string> = { agent: "Agente", automation: "Automação", app: "Aplicativo" };

export const TemplatesMarketplaceView = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Pricing modal
  const [pricingTemplate, setPricingTemplate] = useState<Template | null>(null);
  const [agencyPrice, setAgencyPrice] = useState("");

  useEffect(() => {
    const load = async () => {
      const [tRes, aRes] = await Promise.all([
        supabase.from("platform_templates").select("*").eq("is_active", true).order("sort_order"),
        user ? supabase.from("agency_profiles").select("*").eq("user_id", user.id).maybeSingle() : null,
      ]);
      if (tRes.data) {
        setTemplates(tRes.data.map((t: any) => ({
          ...t,
          features: Array.isArray(t.features) ? t.features : [],
        })));
      }
      if (aRes?.data) setAgency(aRes.data as any);
      setLoading(false);
    };
    load();
  }, [user]);

  const agencyTier = agency?.tier ?? "starter";
  const activeClients = agency?.active_clients_count ?? 0;

  const tierProgress = useMemo(() => {
    if (agencyTier === "hack") return { label: "Nível máximo atingido 🏆", percent: 100, target: 0 };
    if (agencyTier === "explorer") return { label: `${activeClients}/15 clientes para Hack`, percent: Math.min(100, (activeClients / 15) * 100), target: 15 };
    return { label: `${activeClients}/5 clientes para Explorer`, percent: Math.min(100, (activeClients / 5) * 100), target: 5 };
  }, [agencyTier, activeClients]);

  const filtered = templates.filter((t) => {
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const canAccessTier = (minTier: string) => TIER_ORDER[agencyTier] >= TIER_ORDER[minTier];

  const openPricingModal = (t: Template) => {
    const savedPrice = agency?.custom_pricing?.[t.slug];
    setAgencyPrice(savedPrice ? String(savedPrice) : String(t.platform_price_monthly * 2));
    setPricingTemplate(t);
  };

  const savePricing = async () => {
    if (!pricingTemplate || !agency) return;
    const price = Number(agencyPrice);
    if (price <= pricingTemplate.platform_price_monthly) {
      toast.error(`O preço mínimo é R$ ${(pricingTemplate.platform_price_monthly + 1).toFixed(2)}/mês (custo da plataforma)`);
      return;
    }
    const updated = { ...(agency.custom_pricing ?? {}), [pricingTemplate.slug]: price };
    const { error } = await supabase
      .from("agency_profiles")
      .update({ custom_pricing: updated })
      .eq("id", agency.id);
    if (error) {
      toast.error("Erro ao salvar configuração");
      return;
    }
    setAgency((prev) => prev ? { ...prev, custom_pricing: updated } : prev);
    toast.success("Preço configurado com sucesso");
    setPricingTemplate(null);
  };

  const profit = pricingTemplate ? Number(agencyPrice) - pricingTemplate.platform_price_monthly : 0;
  const margin = pricingTemplate && Number(agencyPrice) > 0 ? (profit / Number(agencyPrice)) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Marketplace de Templates</h1>
          <p className="text-sm text-muted-foreground">
            Escolha os templates para oferecer aos seus clientes
          </p>
        </div>

        {/* Tier Badge + Progress */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-primary" />
              <Badge className={`${TIER_COLORS[agencyTier]} border`}>
                {TIER_LABELS[agencyTier]}
              </Badge>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">{tierProgress.label}</p>
              <Progress value={tierProgress.percent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const locked = !canAccessTier(t.min_tier);
            const CatIcon = CATEGORY_ICONS[t.category] ?? Bot;
            return (
              <Card key={t.id} className={`transition-shadow hover:shadow-md ${locked ? "opacity-40" : ""} relative`}>
                {locked && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/40">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-xs gap-1">
                      <CatIcon className="w-3 h-3" />
                      {CATEGORY_LABELS[t.category]}
                    </Badge>
                    {t.min_tier !== "starter" && (
                      <Badge className={`text-[10px] border ${TIER_COLORS[t.min_tier]}`}>
                        Requer {TIER_LABELS[t.min_tier]}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>

                  {/* Features */}
                  {t.features.length > 0 && (
                    <ul className="space-y-1">
                      {(t.features as string[]).slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="pt-1">
                    <span className="text-xs text-muted-foreground">A partir de</span>
                    <span className="font-bold text-foreground text-base ml-1">
                      R$ {Number(t.platform_price_monthly).toFixed(0)}/mês
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {locked ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Lock className="w-3 h-3 mr-1" /> Disponível no tier {TIER_LABELS[t.min_tier]}
                      </Button>
                    ) : (
                      <>
                        {t.demo_url && (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(t.demo_url!, "_blank")}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Ver demo
                          </Button>
                        )}
                        <Button size="sm" className="flex-1" onClick={() => openPricingModal(t)}>
                          <Settings className="w-3 h-3 mr-1" /> Configurar preço
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum template encontrado.
          </div>
        )}
      </div>

      {/* Pricing Modal */}
      <Dialog open={!!pricingTemplate} onOpenChange={(o) => !o && setPricingTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar preço — {pricingTemplate?.name}</DialogTitle>
          </DialogHeader>
          {pricingTemplate && (
            <div className="space-y-5">
              <div>
                <Label className="text-xs text-muted-foreground">Custo da plataforma</Label>
                <p className="text-lg font-bold text-foreground">R$ {Number(pricingTemplate.platform_price_monthly).toFixed(2)}/mês</p>
              </div>

              <div>
                <Label>Seu preço para o cliente (R$/mês)</Label>
                <Input
                  type="number"
                  value={agencyPrice}
                  onChange={(e) => setAgencyPrice(e.target.value)}
                  min={pricingTemplate.platform_price_monthly + 1}
                />
                {Number(agencyPrice) <= pricingTemplate.platform_price_monthly && agencyPrice !== "" && (
                  <p className="text-xs text-destructive mt-1">
                    O preço mínimo é R$ {(pricingTemplate.platform_price_monthly + 1).toFixed(2)}/mês
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Seu lucro estimado</Label>
                  <p className={`text-lg font-bold ${profit > 0 ? "text-green-600" : "text-destructive"}`}>
                    R$ {profit.toFixed(2)}/mês
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Margem</Label>
                  <p className="text-lg font-bold text-foreground">{margin.toFixed(0)}%</p>
                </div>
              </div>

              {/* Projection table */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Exemplo de ganho mensal:</Label>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Clientes</th>
                        <th className="px-3 py-2 text-left font-medium">Receita bruta</th>
                        <th className="px-3 py-2 text-left font-medium">Custo plataforma</th>
                        <th className="px-3 py-2 text-left font-medium">Seu lucro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[5, 10, 20].map((n) => (
                        <tr key={n} className="border-t">
                          <td className="px-3 py-2">{n}</td>
                          <td className="px-3 py-2">R$ {(Number(agencyPrice) * n).toFixed(0)}</td>
                          <td className="px-3 py-2">R$ {(pricingTemplate.platform_price_monthly * n).toFixed(0)}</td>
                          <td className="px-3 py-2 font-medium text-green-600">R$ {(profit * n).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button className="w-full" onClick={savePricing}>Salvar configuração</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const Templates = () => (
  <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      <TemplatesMarketplaceView />
    </div>
  </DashboardLayout>
);

export default Templates;
