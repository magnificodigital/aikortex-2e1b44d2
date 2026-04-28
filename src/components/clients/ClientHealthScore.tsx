interface ClientHealthScoreProps {
  score: number;
  size?: "sm" | "md";
}

const ClientHealthScore = ({ score, size = "sm" }: ClientHealthScoreProps) => {
  const getColor = () => {
    if (score >= 80) return "text-[hsl(var(--success))]";
    if (score >= 50) return "text-[hsl(var(--warning))]";
    return "text-destructive";
  };

  const getBg = () => {
    if (score >= 80) return "bg-[hsl(var(--success))]/15";
    if (score >= 50) return "bg-[hsl(var(--warning))]/15";
    return "bg-destructive/15";
  };

  if (size === "md") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`w-14 h-14 rounded-full ${getBg()} flex items-center justify-center`}>
          <span className={`text-xl font-bold ${getColor()}`}>{score}</span>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Health</span>
      </div>
    );
  }

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBg()} ${getColor()}`}>
      {score}
    </span>
  );
};

export default ClientHealthScore;
