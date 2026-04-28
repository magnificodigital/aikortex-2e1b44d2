import { DollarSign, Users, FolderKanban, CheckCircle2, Clock, TrendingUp, FileText, AlertTriangle } from "lucide-react";
import { MOCK_CLIENTS } from "@/types/client";
import { mockTaskEngine, getProjects } from "@/types/task-engine";
import { mockInvoices, mockSubscriptions } from "@/types/financial";
import { mockContracts } from "@/types/contract";
import { mockTeamMembers } from "@/types/team";

const ReportKPIs = () => {
  const clients = MOCK_CLIENTS;
  const projects = getProjects(mockTaskEngine);
  const tasks = mockTaskEngine.filter(i => i.task_type === "task");
  const activeClients = clients.filter(c => c.status === "active").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const overdueTasks = tasks.filter(t => t.status !== "completed" && new Date(t.dueDate) < new Date()).length;
  const mrr = mockSubscriptions.filter(s => s.status === "active" && s.frequency === "monthly").reduce((s, sub) => s + sub.amount, 0);
  const totalRevenue = mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const activeContracts = mockContracts.filter(c => c.status === "active").length;
  const activeMembers = mockTeamMembers.filter(m => m.status === "active").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const kpis = [
    { label: "Receita Total", value: `R$ ${(totalRevenue / 1000).toFixed(0)}k`, sub: "Faturas pagas", icon: DollarSign, accent: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
    { label: "MRR", value: `R$ ${(mrr / 1000).toFixed(1)}k`, sub: "+18% vs mês anterior", icon: TrendingUp, accent: "bg-primary/10 text-primary" },
    { label: "Clientes Ativos", value: String(activeClients), sub: `${clients.length} total`, icon: Users, accent: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
    { label: "Projetos", value: String(projects.length), sub: `${projects.filter(p => p.status === "completed").length} concluídos`, icon: FolderKanban, accent: "bg-primary/10 text-primary" },
    { label: "Tarefas Concluídas", value: String(completedTasks), sub: `${completionRate}% taxa de conclusão`, icon: CheckCircle2, accent: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
    { label: "Tarefas Atrasadas", value: String(overdueTasks), sub: overdueTasks > 0 ? "Atenção necessária" : "Tudo em dia", icon: AlertTriangle, accent: "bg-destructive/10 text-destructive" },
    { label: "Contratos Ativos", value: String(activeContracts), sub: `${mockContracts.length} total`, icon: FileText, accent: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    { label: "Equipe Ativa", value: String(activeMembers), sub: `${mockTeamMembers.length} membros`, icon: Clock, accent: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="glass-card rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.accent}`}>
              <k.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground">{k.value}</div>
          <div className="text-[10px] text-muted-foreground">{k.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default ReportKPIs;
