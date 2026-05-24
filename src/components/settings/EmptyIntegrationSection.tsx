import { type LucideIcon, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  /** Quando true, exibe selo "Em breve" no header e desabilita o botão. */
  comingSoon?: boolean;
}

/**
 * Bloco padrão para seções de integração que ainda não têm itens
 * configurados (MCPs, Webhooks, etc). Mantém a mesma linguagem visual
 * dos canais de disparo: header com ícone/título/contador + card com
 * empty state e botão de adicionar.
 */
export default function EmptyIntegrationSection({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  comingSoon = false,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {comingSoon ? (
          <Badge variant="outline" className="text-[10px]">Em breve</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">0 configurados</Badge>
        )}
      </div>

      <Card className="p-6 flex flex-col items-center justify-center gap-3 text-center border-dashed">
        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary/60" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-medium text-foreground">Nenhum {title.toLowerCase()} configurado</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 mt-1"
          onClick={onAction}
          disabled={comingSoon}
        >
          <Plus className="w-3 h-3" /> {actionLabel}
        </Button>
      </Card>
    </div>
  );
}
