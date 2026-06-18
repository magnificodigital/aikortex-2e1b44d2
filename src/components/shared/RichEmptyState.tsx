import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Action {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  icon?: LucideIcon;
}

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  variant?: "card" | "inline";
  className?: string;
  children?: ReactNode;
}

// Empty state ilustrado: ícone grande circular + título + descrição
// + 1-2 CTAs. Usado em seções de agente onde antes ficava texto seco.
const RichEmptyState = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "card",
  className = "",
  children,
}: Props) => {
  const Container = variant === "card" ? "div" : "div";
  const containerCls =
    variant === "card"
      ? `rounded-xl border border-dashed border-border bg-card/40 p-8 lg:p-12 ${className}`
      : `py-10 ${className}`;

  return (
    <Container className={containerCls}>
      <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {children}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {primaryAction && (
              <Button
                size="sm"
                variant={primaryAction.variant ?? "default"}
                onClick={primaryAction.onClick}
                className="gap-1.5"
              >
                {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                size="sm"
                variant={secondaryAction.variant ?? "outline"}
                onClick={secondaryAction.onClick}
                className="gap-1.5"
              >
                {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Container>
  );
};

export default RichEmptyState;
