import { TeamMember } from "@/types/team";
import MetricCard from "@/components/MetricCard";
import { UsersRound, UserCheck, Clock, AlertTriangle } from "lucide-react";

interface TeamMetricsProps {
  members: TeamMember[];
}

const TeamMetrics = ({ members }: TeamMetricsProps) => {
  const active = members.filter((m) => m.status === "active").length;
  const totalTasks = members.reduce((s, m) => s + m.assignedTasks, 0);
  const totalOverdue = members.reduce((s, m) => s + m.overdueTasks, 0);
  const totalHours = members.reduce((s, m) => s + m.totalHoursLogged, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard icon={UsersRound} title="Membros Ativos" value={String(active)} change={`${members.length} total`} changeType="neutral" />
      <MetricCard icon={UserCheck} title="Tarefas Atribuídas" value={String(totalTasks)} change={`${members.reduce((s, m) => s + m.completedTasks, 0)} concluídas`} changeType="positive" />
      <MetricCard icon={AlertTriangle} title="Tarefas Atrasadas" value={String(totalOverdue)} change={totalOverdue > 0 ? "Atenção necessária" : "Tudo em dia"} changeType={totalOverdue > 0 ? "negative" : "positive"} />
      <MetricCard icon={Clock} title="Horas Registradas" value={`${Math.round(totalHours / 60)}h`} change="Total acumulado" changeType="neutral" />
    </div>
  );
};

export default TeamMetrics;
