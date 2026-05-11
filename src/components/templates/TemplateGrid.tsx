import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import TemplateCard from "./TemplateCard";
import type { TemplateRow } from "@/types/templates";

type Props = {
  templates: TemplateRow[];
  onUseTemplate: (template: TemplateRow) => void;
  loading?: boolean;
  emptyState?: ReactNode;
};

const TemplateGrid = ({ templates, onUseTemplate, loading, emptyState }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <>
        {emptyState ?? (
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
        )}
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} onUse={() => onUseTemplate(t)} />
      ))}
    </div>
  );
};

export default TemplateGrid;
