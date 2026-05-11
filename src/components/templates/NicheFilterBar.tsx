import { LayoutGrid, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getNicheIcon } from "@/lib/niches";
import { useNichesWithCounts } from "@/hooks/use-niche-templates";
import type { TemplateCategory } from "@/types/templates";

type Props = {
  selectedNicheSlug: string | null;
  onSelect: (slug: string | null) => void;
  category?: TemplateCategory;
};

const NicheFilterBar = ({ selectedNicheSlug, onSelect, category }: Props) => {
  const { data, isLoading, isError, refetch } = useNichesWithCounts(category);

  if (isLoading) {
    return (
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-40 rounded-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span>Não foi possível carregar os nichos.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const niches = data?.niches ?? [];
  const counts = data?.counts ?? new Map<string, number>();
  const total = data?.total ?? 0;

  return (
    <div className="flex gap-2 flex-wrap">
      <Pill
        active={selectedNicheSlug === null}
        onClick={() => onSelect(null)}
        icon={LayoutGrid}
        label="Todos"
        count={total}
      />
      {niches.map((n) => {
        const Icon = getNicheIcon(n.icon);
        return (
          <Pill
            key={n.id}
            active={selectedNicheSlug === n.slug}
            onClick={() => onSelect(n.slug)}
            icon={Icon}
            label={n.name_pt}
            count={counts.get(n.id) ?? 0}
          />
        );
      })}
    </div>
  );
};

const Pill = ({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) => (
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

export default NicheFilterBar;
