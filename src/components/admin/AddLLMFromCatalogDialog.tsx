import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Search, Plus, Check, RefreshCw } from "lucide-react";

interface CatalogModel {
  model_id: string;
  display_name: string;
  provider: string;
  description: string | null;
  context_length: number | null;
  supports_tools: boolean;
  supports_streaming: boolean;
  modality: string | null;
  prompt_price_per_million_usd: number | null;
  completion_price_per_million_usd: number | null;
  is_free: boolean;
}

interface AddLLMFromCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** model_ids já cadastrados no DB — pra desabilitar botão "Adicionar" */
  alreadyAdded: Set<string>;
  /** Callback após adicionar com sucesso (pra refazer load no parent) */
  onAdded: () => void;
}

type FilterTier = "all" | "free" | "paid";
type FilterTools = "all" | "yes" | "no";

const AddLLMFromCatalogDialog = ({ open, onOpenChange, alreadyAdded, onAdded }: AddLLMFromCatalogDialogProps) => {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<FilterTier>("all");
  const [tools, setTools] = useState<FilterTools>("all");
  const [adding, setAdding] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const fetchCatalog = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("openrouter-catalog", {
        body: { force },
      });
      if (error) throw error;
      const list = (data as any)?.models as CatalogModel[];
      setModels(list || []);
      setCachedAt((data as any)?.cached_at || null);
    } catch (e) {
      toast.error("Falha ao carregar catálogo OpenRouter: " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (open && models.length === 0) {
      fetchCatalog(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return models.filter((m) => {
      if (q && !`${m.model_id} ${m.display_name} ${m.provider}`.toLowerCase().includes(q)) return false;
      if (tier === "free" && !m.is_free) return false;
      if (tier === "paid" && m.is_free) return false;
      if (tools === "yes" && !m.supports_tools) return false;
      if (tools === "no" && m.supports_tools) return false;
      return true;
    });
  }, [models, search, tier, tools]);

  const addModel = async (m: CatalogModel) => {
    setAdding(m.model_id);
    try {
      // Calcula priority sugerida: usa 100 como base + 10 incremental no tier
      const { data: existing } = await supabase
        .from("available_llms")
        .select("priority, tier")
        .eq("tier", m.is_free ? "free" : "paid")
        .order("priority", { ascending: false })
        .limit(1);
      const lastPriority = (existing?.[0]?.priority as number | undefined) ?? (m.is_free ? 0 : 100);
      const suggestedPriority = lastPriority + 10;

      const { error } = await supabase.from("available_llms").upsert(
        {
          model_id: m.model_id,
          display_name: m.display_name,
          provider: m.provider,
          tier: m.is_free ? "free" : "paid",
          context_window: m.context_length,
          supports_tools: m.supports_tools,
          supports_streaming: m.supports_streaming,
          modality: m.modality,
          prompt_price_per_million_usd: m.prompt_price_per_million_usd,
          completion_price_per_million_usd: m.completion_price_per_million_usd,
          priority: suggestedPriority,
          active: true,
          status: "unknown",
          consecutive_failures: 0,
        },
        { onConflict: "model_id" },
      );
      if (error) throw error;
      toast.success(`${m.display_name} adicionado (prioridade ${suggestedPriority})`);
      onAdded();
    } catch (e) {
      toast.error("Falha ao adicionar: " + (e as Error).message);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Catálogo OpenRouter</DialogTitle>
          <DialogDescription>
            Adicione modelos diretamente do catálogo do OpenRouter sem editar SQL. Atualizado automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar: busca + filtros + refresh */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, provider ou model_id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <ToggleGroup type="single" value={tier} onValueChange={(v) => v && setTier(v as FilterTier)} size="sm">
            <ToggleGroupItem value="all" className="text-xs h-8">Todos</ToggleGroupItem>
            <ToggleGroupItem value="free" className="text-xs h-8">Free</ToggleGroupItem>
            <ToggleGroupItem value="paid" className="text-xs h-8">Paid</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" value={tools} onValueChange={(v) => v && setTools(v as FilterTools)} size="sm">
            <ToggleGroupItem value="all" className="text-xs h-8">Tools?</ToggleGroupItem>
            <ToggleGroupItem value="yes" className="text-xs h-8">Sim</ToggleGroupItem>
            <ToggleGroupItem value="no" className="text-xs h-8">Não</ToggleGroupItem>
          </ToggleGroup>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchCatalog(true)}
            disabled={refreshing}
            title="Atualiza cache do catálogo"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Resumo */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{loading ? "Carregando…" : `${filtered.length} de ${models.length} modelos`}</span>
          {cachedAt && <span>Catálogo de {new Date(cachedAt).toLocaleString("pt-BR")}</span>}
        </div>

        {/* Lista */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {filtered.map((m) => {
                const isAdded = alreadyAdded.has(m.model_id);
                return (
                  <div
                    key={m.model_id}
                    className="flex items-center gap-3 rounded-md border border-border/50 bg-card p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{m.display_name}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{m.provider}</Badge>
                        {m.is_free ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] h-4 px-1">free</Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] h-4 px-1">paid</Badge>
                        )}
                        {m.supports_tools && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">tools</Badge>
                        )}
                        {m.modality && m.modality !== "text" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{m.modality}</Badge>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">{m.model_id}</div>
                      <div className="text-[10px] text-muted-foreground flex gap-3 mt-0.5">
                        {m.context_length && <span>{(m.context_length / 1000).toFixed(0)}K ctx</span>}
                        {!m.is_free && m.prompt_price_per_million_usd != null && (
                          <span>
                            ${m.prompt_price_per_million_usd}/1M in · ${m.completion_price_per_million_usd}/1M out
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? "ghost" : "default"}
                      disabled={isAdded || adding === m.model_id}
                      onClick={() => addModel(m)}
                      className="shrink-0"
                    >
                      {adding === m.model_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Adicionado
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
              {filtered.length === 0 && !loading && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Nenhum modelo bate com esses filtros.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddLLMFromCatalogDialog;
