import { Users, FolderKanban, Bot, DollarSign } from "lucide-react";
import { Client } from "@/types/client";

interface ClientMetricsProps {
  clients: Client[];
}

const ClientMetrics = ({ clients }: ClientMetricsProps) => {
  const active = clients.filter(c => c.status === "active").length;
  const totalRevenue = clients
    .filter(c => c.status === "active")
    .reduce((s, c) => s + parseFloat(c.revenue.replace(/[^\d]/g, "")) / 100, 0);

  const metrics = [
    { label: "Total Clientes", value: clients.length, sub: `${active} ativos`, icon: Users },
    { label: "Projetos", value: clients.reduce((s, c) => s + c.projects, 0), sub: "em andamento", icon: FolderKanban },
    { label: "Agentes IA", value: clients.reduce((s, c) => s + c.agents, 0), sub: "em produção", icon: Bot },
    { label: "Receita Mensal", value: `R$ ${totalRevenue.toFixed(1)}k`, sub: "clientes ativos", icon: DollarSign },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(m => (
        <div key={m.label} className="glass-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{m.label}</span>
            <m.icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{m.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
        </div>
      ))}
    </div>
  );
};

export default ClientMetrics;
