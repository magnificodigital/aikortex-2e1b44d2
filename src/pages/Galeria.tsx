import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  LayoutGrid,
  Search,
  Bot,
  Zap,
  LayoutDashboard,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getNicheIcon } from "@/lib/niches";

interface NicheRow {
  id: string;
  slug: string;
  name_pt: string;
  icon: string;
  description: string | null;
  display_order: number;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  niche_id: string;
  niche_categories: {
    slug: string;
    name_pt: string;
    icon: string;
  } | null;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: typeof Bot; className: string }
> = {
  agent: {
    label: "Agente",
    icon: Bot,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  automation: {
    label: "Automação",
    icon: Zap,
    className: "bg-muted text-muted-foreground border-border",
  },
  app: {
    label: "App",
    icon: LayoutDashboard,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
};

type CategoryFilter = "todos" | "agent" | "automation" | "app";

const useDebounced = <T,>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const GalleryHeader = () => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
      <LayoutGrid className="w-5 h-5 text-primary" />
    </div>
    <div>
      <h1 className="text-2xl font-bold text-foreground">Galeria por Nicho</h1>
      <p className="text-sm text-muted-foreground">
        Templates prontos para você adaptar e vender em minutos.
      </p>
    </div>
  </div>
);

const Galeria = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const nichoParam = searchParams.get("nicho") || "todos";
  const tipoParam = (searchParams.get("tipo") as CategoryFilter) || "todos";
  const buscaParam = searchParams.get("busca") || "";

  const [searchInput, setSearchInput] = useState(buscaParam);
  const debouncedSearch = useDebounced(searchInput, 300);

  // Sync debounced search -> URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) params.set("busca", debouncedSearch);
    else params.delete("busca");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "todos") params.set(key, value);
    else params.delete(key);
    setSearchParams(params, { replace: true });
  };

  // 1. Niches with counts
  const {
    data: nichesData,
    isLoading: nichesLoading,
    isError: nichesError,
    refetch: refetchNiches,
  } = useQuery({
    queryKey: ["niches", "with-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [nichesRes, countsRes] = await Promise.all([
        supabase
          .from("niche_categories")
          .select("id, slug, name_pt, icon, description, display_order")
          .eq("active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("platform_templates")
          .select("niche_id")
          .eq("is_active", true)
          .not("niche_id", "is", null),
      ]);
      if (nichesRes.error) throw nichesRes.error;
      if (countsRes.error) throw countsRes.error;

      const niches = (nichesRes.data ?? []) as NicheRow[];
      const counts = new Map<string, number>();
      let total = 0;
      (countsRes.data ?? []).forEach((row: { niche_id: string | null }) => {
        if (!row.niche_id) return;
        counts.set(row.niche_id, (counts.get(row.niche_id) ?? 0) + 1);
        total++;
      });
      return { niches, counts, total };
    },
  });

  // 2. Templates filtered
  const {
    data: templates = [],
    isLoading: templatesLoading,
    isError: templatesError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: [
      "gallery-templates",
      { nicho: nichoParam, tipo: tipoParam, busca: debouncedSearch },
    ],
    queryFn: async () => {
      let query = supabase
        .from("platform_templates")
        .select(
          "id, name, description, category, niche_id, niche_categories!inner(slug, name_pt, icon)"
        )
        .eq("is_active", true)
        .not("niche_id", "is", null);

      if (nichoParam !== "todos") {
        query = query.eq("niche_categories.slug", nichoParam);
      }
      if (tipoParam !== "todos") {
        query = query.eq("category", tipoParam);
      }
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TemplateRow[];
    },
  });

  const niches = nichesData?.niches ?? [];
  const counts = nichesData?.counts ?? new Map<string, number>();
  const totalCategorized = nichesData?.total ?? 0;

  const isLoading = nichesLoading || templatesLoading;
  const isError = nichesError || templatesError;

  const handleUse = (name: string) => {
    toast.info(
      `Fluxo de adaptação em construção — disponível no próximo sprint. (${name})`
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <GalleryHeader />

        {isError && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span>Não foi possível carregar a galeria.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  refetchNiches();
                  refetchTemplates();
                }}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Niche pills */}
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Nichos disponíveis
          </p>
          {nichesLoading ? (
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-40 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <NichePill
                active={nichoParam === "todos"}
                onClick={() => updateParam("nicho", null)}
                icon={LayoutGrid}
                label="Todos"
                count={totalCategorized}
              />
              {niches.map((n) => {
                const Icon = getNicheIcon(n.icon);
                return (
                  <NichePill
                    key={n.id}
                    active={nichoParam === n.slug}
                    onClick={() => updateParam("nicho", n.slug)}
                    icon={Icon}
                    label={n.name_pt}
                    count={counts.get(n.id) ?? 0}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Secondary filters */}
        <section className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Tipo:</span>
            <ToggleGroup
              type="single"
              value={tipoParam}
              onValueChange={(v) => updateParam("tipo", v || "todos")}
              className="bg-muted/40 rounded-md p-0.5"
            >
              <ToggleGroupItem value="todos" size="sm" className="text-xs h-7 px-3">
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="agent" size="sm" className="text-xs h-7 px-3">
                Agentes
              </ToggleGroupItem>
              <ToggleGroupItem
                value="automation"
                size="sm"
                className="text-xs h-7 px-3"
              >
                Automações
              </ToggleGroupItem>
              <ToggleGroupItem value="app" size="sm" className="text-xs h-7 px-3">
                Apps
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="relative flex-1 max-w-md md:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </section>

        {/* Grid */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              globalEmpty={
                nichoParam === "todos" && tipoParam === "todos" && !debouncedSearch
              }
              onClear={() => setSearchParams({}, { replace: true })}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={handleUse} />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

// ─── Subcomponents ────────────────────────────────────

interface NichePillProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}

const NichePill = ({ active, onClick, icon: Icon, label, count }: NichePillProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm ${
      active
        ? "bg-primary text-primary-foreground border-primary shadow-sm"
        : "bg-card border-border text-foreground hover:border-primary/40 hover:bg-accent/50"
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="font-medium">{label}</span>
    <span
      className={`text-xs px-1.5 py-0.5 rounded-full ${
        active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
      }`}
    >
      {count}
    </span>
  </button>
);

interface TemplateCardProps {
  template: TemplateRow;
  onUse: (name: string) => void;
}

const TemplateCard = ({ template, onUse }: TemplateCardProps) => {
  const meta = CATEGORY_META[template.category] ?? CATEGORY_META.agent;
  const CategoryIcon = meta.icon;
  const niche = template.niche_categories;
  const NicheIcon = getNicheIcon(niche?.icon);

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/40 flex flex-col"
      onClick={() => onUse(template.name)}
    >
      <CardContent className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
            <CategoryIcon className="w-3 h-3" />
            {meta.label}
          </Badge>
          {niche && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <NicheIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{niche.name_pt}</span>
            </Badge>
          )}
        </div>

        <h3 className="font-bold text-base text-foreground line-clamp-2 leading-snug">
          {template.name}
        </h3>

        <div className="relative flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {template.description || "Sem descrição."}
          </p>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent" />
        </div>

        <Button
          className="w-full gap-1.5 mt-1"
          onClick={(e) => {
            e.stopPropagation();
            onUse(template.name);
          }}
        >
          Usar
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({
  globalEmpty,
  onClear,
}: {
  globalEmpty: boolean;
  onClear: () => void;
}) => (
  <Card className="border-dashed">
    <CardContent className="p-12 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <LayoutGrid className="w-5 h-5 text-muted-foreground" />
      </div>
      {globalEmpty ? (
        <>
          <p className="text-sm font-medium text-foreground">
            Sua galeria ainda está vazia.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Volte em breve — estamos adicionando templates por nicho.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Nenhum template encontrado para esses filtros.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Tente outro nicho ou limpe a busca.
          </p>
          <Button variant="outline" size="sm" onClick={onClear} className="mt-2">
            Limpar filtros
          </Button>
        </>
      )}
    </CardContent>
  </Card>
);

export default Galeria;
