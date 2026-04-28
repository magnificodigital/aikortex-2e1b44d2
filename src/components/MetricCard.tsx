import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

const MetricCard = ({ title, value, change, changeType = "neutral", icon: Icon }: MetricCardProps) => {
  const changeColor = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  }[changeType];

  return (
    <div className="glass-card rounded-lg p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {change && (
        <p className={`text-xs mt-1 ${changeColor}`}>{change}</p>
      )}
    </div>
  );
};

export default MetricCard;
