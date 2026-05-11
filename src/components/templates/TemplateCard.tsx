import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Zap, LayoutDashboard, ArrowRight } from "lucide-react";
import { getNicheIcon } from "@/lib/niches";
import type { TemplateRow } from "@/types/templates";

type Props = {
  template: TemplateRow;
  onUse: () => void;
};

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

const TemplateCard = ({ template, onUse }: Props) => {
  const meta = CATEGORY_META[template.category] ?? CATEGORY_META.agent;
  const CategoryIcon = meta.icon;
  const niche = template.niche_categories;
  const NicheIcon = getNicheIcon(niche?.icon);

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/40 flex flex-col"
      onClick={onUse}
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
            onUse();
          }}
        >
          Usar
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default TemplateCard;
