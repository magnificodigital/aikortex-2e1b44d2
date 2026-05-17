import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { getNicheIcon } from "@/lib/niches";
import type { TemplateRow } from "@/types/templates";

type Props = {
  templates: TemplateRow[];
  loading?: boolean;
  onUseTemplate: (template: TemplateRow) => void;
};

type NicheGroup = {
  slug: string;
  name: string;
  icon: string;
  items: TemplateRow[];
};

const TemplateNicheCarousel = ({ templates, loading, onUseTemplate }: Props) => {
  const groups = useMemo<NicheGroup[]>(() => {
    const map = new Map<string, NicheGroup>();
    for (const t of templates) {
      const niche = t.niche_categories;
      const slug = niche?.slug ?? "outros";
      const name = niche?.name_pt ?? "Outros";
      const icon = niche?.icon ?? "";
      if (!map.has(slug)) map.set(slug, { slug, name, icon, items: [] });
      map.get(slug)!.items.push(t);
    }
    return Array.from(map.values());
  }, [templates]);

  if (loading) {
    return (
      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-5 overflow-hidden">
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="flex-none w-64 aspect-[4/5] rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Nenhum template encontrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => {
        const NicheIcon = getNicheIcon(group.icon);
        return (
          <section key={group.slug} className="space-y-4">
            <div className="flex items-end justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <NicheIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    {group.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "template" : "templates"} disponíveis
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar snap-x snap-mandatory">
              {group.items.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => onUseTemplate(t)}
                  className="flex-none w-64 group snap-start text-left"
                >
                  <div className="relative aspect-[4/5] rounded-2xl bg-card border border-border overflow-hidden transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.35)]">
                    {/* Ambient gradient backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                    {/* Top icon */}
                    <div className="absolute top-4 left-4">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 backdrop-blur-sm">
                        <NicheIcon className="w-5 h-5 text-primary" />
                      </div>
                    </div>

                    {/* Bottom content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                      <h3 className="text-base font-semibold text-foreground line-clamp-2">
                        {t.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {t.description || "Sem descrição."}
                      </p>
                      <div className="pt-2 opacity-0 translate-y-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        <div className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold text-center">
                          Usar template
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default TemplateNicheCarousel;
