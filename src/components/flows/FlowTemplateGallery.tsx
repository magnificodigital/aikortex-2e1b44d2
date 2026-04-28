import { useState } from "react";
import { FLOW_TEMPLATES, type FlowTemplate } from "@/types/flow-builder";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Workflow, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (template: FlowTemplate) => void;
}

const categoryIcons: Record<string, string> = {
  Vendas: "🎯",
  Suporte: "🛟",
  "Sucesso do Cliente": "🚀",
  "E-commerce": "🛒",
  Produtividade: "📅",
};

const categoryColors: Record<string, string> = {
  Vendas: "border-primary/30",
  Suporte: "border-primary/30",
  "Sucesso do Cliente": "border-primary/30",
  "E-commerce": "border-primary/30",
  Produtividade: "border-primary/30",
};

export default function FlowTemplateGallery({ onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(FLOW_TEMPLATES.map((t) => t.category))];
  const filtered = FLOW_TEMPLATES.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = categories
    .map((cat) => ({
      category: cat,
      items: filtered.filter((t) => t.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            Templates prontos
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Comece com um fluxo pré-montado. Clique para abrir, personalizar e publicar.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all",
            !selectedCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          )}
        >
          Todos ({FLOW_TEMPLATES.length})
        </button>
        {categories.map((cat) => {
          const count = FLOW_TEMPLATES.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <span>{categoryIcons[cat] || "📋"}</span>
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Templates grid */}
      {grouped.map((group) => (
        <div key={group.category}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{categoryIcons[group.category] || "📋"}</span>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.category}
            </h3>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.items.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className={cn(
                  "text-left rounded-xl border bg-transparent p-5 hover:scale-[1.02] hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden",
                  categoryColors[tpl.category] || "border-border"
                )}
              >
                {/* Subtle glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{tpl.icon}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                    {tpl.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">
                    {tpl.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-background/50">
                      {tpl.nodes.length} blocos
                    </Badge>
                    {tpl.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 border-border/50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 flex flex-col items-center text-center">
          <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum template encontrado</p>
        </div>
      )}
    </div>
  );
}
