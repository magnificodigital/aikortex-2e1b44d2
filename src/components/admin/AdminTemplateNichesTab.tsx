import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tags,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getNicheIcon } from "@/lib/niches";

interface NicheRow {
  id: string;
  slug: string;
  name_pt: string;
  icon: string;
  display_order: number;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  niche_id: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agente",
  automation: "Automação",
  app: "Aplicativo",
};

const CATEGORY_COLORS: Record<string, string> = {
  agent: "bg-primary/10 text-primary",
  automation: "bg-blue-500/10 text-blue-600",
  app: "bg-emerald-500/10 text-emerald-600",
};

// Static map of icons used by seeded niches. Fallback = Tag.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope,
  ShieldCheck,
  Building2,
};

const getNicheIcon = (iconName: string) => ICON_MAP[iconName] ?? Tag;

type CategoryFilter = "all" | "agent" | "automation" | "app";

const PAGE_SIZE = 20;

const AdminTemplateNichesTab = () => {
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all"); // 'all' | 'none' | nicheId
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const { data: niches = [] } = useQuery({
    queryKey: ["niche-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("niche_categories")
        .select("id, slug, name_pt, icon, display_order")
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NicheRow[];
    },
  });

  const {
    data: templates = [],
    isLoading,
  } = useQuery({
    queryKey: ["admin", "platform-templates", "niches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_templates")
        .select("id, name, description, category, niche_id")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const nichesById = useMemo(() => {
    const map = new Map<string, NicheRow>();
    niches.forEach((n) => map.set(n.id, n));
    return map;
  }, [niches]);

  // Category counters (computed before niche/search filtering)
  const categoryCounts = useMemo(() => {
    const counts = { all: templates.length, agent: 0, automation: 0, app: 0 } as Record<
      CategoryFilter,
      number
    >;
    templates.forEach((t) => {
      if (t.category in counts) counts[t.category as CategoryFilter]++;
    });
    return counts;
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (nicheFilter === "none" && t.niche_id !== null) return false;
      if (nicheFilter !== "all" && nicheFilter !== "none" && t.niche_id !== nicheFilter)
        return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, categoryFilter, nicheFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const withoutNicheCount = templates.filter((t) => t.niche_id === null).length;

  // Reset selection when filters change
  const resetSelection = () => setSelectedIds(new Set());

  const updateMutation = useMutation({
    mutationFn: async ({ ids, nicheId }: { ids: string[]; nicheId: string | null }) => {
      const { error } = await supabase
        .from("platform_templates")
        .update({ niche_id: nicheId })
        .in("id", ids);
      if (error) throw error;
      return { ids, nicheId };
    },
    // Optimistic update
    onMutate: async ({ ids, nicheId }) => {
      await queryClient.cancelQueries({
        queryKey: ["admin", "platform-templates", "niches"],
      });
      const previous = queryClient.getQueryData<TemplateRow[]>([
        "admin",
        "platform-templates",
        "niches",
      ]);
      queryClient.setQueryData<TemplateRow[]>(
        ["admin", "platform-templates", "niches"],
        (old) =>
          (old ?? []).map((t) => (ids.includes(t.id) ? { ...t, niche_id: nicheId } : t))
      );
      return { previous };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["admin", "platform-templates", "niches"], ctx.previous);
      }
      toast.error(err?.message || "Erro ao atualizar nicho");
    },
    onSuccess: ({ ids, nicheId }) => {
      const niche = nicheId ? nichesById.get(nicheId) : null;
      toast.success(
        ids.length === 1
          ? niche
            ? `Nicho atribuído: ${niche.name_pt}`
            : "Nicho removido"
          : `${ids.length} templates atualizados`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "platform-templates", "niches"],
      });
    },
  });

  const assignNiche = (ids: string[], nicheId: string | null) => {
    if (ids.length === 0) return;
    updateMutation.mutate({ ids, nicheId });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = pageRows.map((r) => r.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id));

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const onCategoryChange = (v: string) => {
    setCategoryFilter(v as CategoryFilter);
    setPage(0);
    resetSelection();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tags className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Categorização por Nicho
            </h2>
            <p className="text-xs text-muted-foreground">
              Atribua um nicho a cada template para aparecer na galeria das agências.
            </p>
          </div>
        </div>
        {withoutNicheCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {withoutNicheCount} de {templates.length} sem nicho
          </Badge>
        )}
      </div>

      {/* Category tabs */}
      <Tabs value={categoryFilter} onValueChange={onCategoryChange}>
        <TabsList>
          <TabsTrigger value="all">Todos ({categoryCounts.all})</TabsTrigger>
          <TabsTrigger value="agent">Agente ({categoryCounts.agent})</TabsTrigger>
          <TabsTrigger value="automation">
            Automação ({categoryCounts.automation})
          </TabsTrigger>
          <TabsTrigger value="app">App ({categoryCounts.app})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={nicheFilter}
          onValueChange={(v) => {
            setNicheFilter(v);
            setPage(0);
            resetSelection();
          }}
        >
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Nicho: Todos</SelectItem>
            <SelectItem value="none">Sem nicho apenas</SelectItem>
            {niches.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.name_pt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allOnPageSelected
                        ? true
                        : someOnPageSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={togglePage}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="w-32">Categoria</TableHead>
                <TableHead className="w-56">Nicho atual</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    Nenhum template encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((t) => {
                  const niche = t.niche_id ? nichesById.get(t.niche_id) : null;
                  const NicheIcon = niche ? getNicheIcon(niche.icon) : null;
                  const selected = selectedIds.has(t.id);
                  return (
                    <TableRow key={t.id} data-state={selected ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleRow(t.id)}
                          aria-label={`Selecionar ${t.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-md">
                            {t.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] border-0 ${
                            CATEGORY_COLORS[t.category] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {niche && NicheIcon ? (
                          <div className="inline-flex items-center gap-1.5 text-sm">
                            <NicheIcon className="w-3.5 h-3.5 text-primary" />
                            <span>{niche.name_pt}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            — sem nicho —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Alterar nicho"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {niches.map((n) => {
                              const Icon = getNicheIcon(n.icon);
                              return (
                                <DropdownMenuItem
                                  key={n.id}
                                  onClick={() => assignNiche([t.id], n.id)}
                                  className="gap-2"
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {n.name_pt}
                                </DropdownMenuItem>
                              );
                            })}
                            {t.niche_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => assignNiche([t.id], null)}
                                  className="text-destructive"
                                >
                                  Remover nicho
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card className="border-primary/40 shadow-lg">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-primary-foreground">
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={resetSelection}
                >
                  Limpar
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    Atribuir nicho em lote
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {niches.map((n) => {
                    const Icon = getNicheIcon(n.icon);
                    return (
                      <DropdownMenuItem
                        key={n.id}
                        onClick={() => {
                          assignNiche(Array.from(selectedIds), n.id);
                          resetSelection();
                        }}
                        className="gap-2"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {n.name_pt}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      assignNiche(Array.from(selectedIds), null);
                      resetSelection();
                    }}
                    className="text-destructive"
                  >
                    Remover nicho
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminTemplateNichesTab;
