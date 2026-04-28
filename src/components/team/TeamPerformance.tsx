import { TeamMember } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Target, Zap, Users, Lightbulb } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

interface TeamPerformanceProps {
  members: TeamMember[];
  onMemberClick: (member: TeamMember) => void;
}

const trendIcon = (trend: "up" | "down" | "stable") => {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--success))]" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const scoreColor = (score: number) => {
  if (score >= 85) return "text-[hsl(var(--success))]";
  if (score >= 70) return "text-[hsl(var(--warning))]";
  return "text-destructive";
};

const TeamPerformance = ({ members, onMemberClick }: TeamPerformanceProps) => {
  const active = members.filter((m) => m.status === "active").sort((a, b) => b.performance.score - a.performance.score);
  const avgScore = active.length > 0 ? Math.round(active.reduce((s, m) => s + m.performance.score, 0) / active.length) : 0;

  const topPerformer = active[0];
  const radarData = topPerformer ? [
    { metric: "Pontualidade", value: topPerformer.performance.punctuality },
    { metric: "Qualidade", value: topPerformer.performance.quality },
    { metric: "Colaboração", value: topPerformer.performance.collaboration },
    { metric: "Iniciativa", value: topPerformer.performance.initiative },
  ] : [];

  const teamAvgData = [
    { metric: "Pontualidade", value: Math.round(active.reduce((s, m) => s + m.performance.punctuality, 0) / active.length) },
    { metric: "Qualidade", value: Math.round(active.reduce((s, m) => s + m.performance.quality, 0) / active.length) },
    { metric: "Colaboração", value: Math.round(active.reduce((s, m) => s + m.performance.collaboration, 0) / active.length) },
    { metric: "Iniciativa", value: Math.round(active.reduce((s, m) => s + m.performance.initiative, 0) / active.length) },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Score Médio</span>
          </div>
          <p className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</p>
          <p className="text-[10px] text-muted-foreground mt-1">de 100 pontos</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[hsl(var(--warning))]" />
            <span className="text-xs text-muted-foreground">Em Ascensão</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{active.filter((m) => m.performance.trend === "up").length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">membros melhorando</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[hsl(var(--success))]" />
            <span className="text-xs text-muted-foreground">Top Performers</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{active.filter((m) => m.performance.score >= 85).length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">score ≥ 85</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Atenção</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{active.filter((m) => m.performance.score < 70).length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">score &lt; 70</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ranking de Desempenho</h3>
          <div className="space-y-3">
            {active.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 cursor-pointer hover:bg-accent/40 rounded-lg p-2 -mx-2 transition-colors" onClick={() => onMemberClick(m)}>
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}º</span>
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground truncate">{m.fullName}</span>
                    <div className="flex items-center gap-1.5">
                      {trendIcon(m.performance.trend)}
                      <span className={`text-sm font-bold ${scoreColor(m.performance.score)}`}>{m.performance.score}</span>
                    </div>
                  </div>
                  <Progress value={m.performance.score} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar chart - team average */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Competências da Equipe (Média)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={teamAvgData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Equipe" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly evolution chart */}
      {topPerformer && topPerformer.performance.monthlyScores.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Mensal — Top 3</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={active[0].performance.monthlyScores.map((ms, idx) => ({
              month: ms.month,
              [active[0]?.fullName.split(" ")[0]]: active[0]?.performance.monthlyScores[idx]?.score || 0,
              [active[1]?.fullName.split(" ")[0]]: active[1]?.performance.monthlyScores[idx]?.score || 0,
              [active[2]?.fullName.split(" ")[0]]: active[2]?.performance.monthlyScores[idx]?.score || 0,
            }))}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey={active[0]?.fullName.split(" ")[0]} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey={active[1]?.fullName.split(" ")[0]} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey={active[2]?.fullName.split(" ")[0]} fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TeamPerformance;
