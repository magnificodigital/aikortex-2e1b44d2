import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { mockContracts } from "@/types/contract";

const ContractMetrics = () => {
  const active = mockContracts.filter(c => c.status === "active").length;
  const pending = mockContracts.filter(c => c.status === "pending_signature").length;
  const expiringSoon = mockContracts.filter(c => {
    if (c.status !== "active") return false;
    const end = new Date(c.endDate);
    const now = new Date();
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  }).length;
  const totalMRR = mockContracts
    .filter(c => c.status === "active" && c.frequency === "monthly")
    .reduce((s, c) => s + c.value, 0);

  const metrics = [
    { label: "Contratos Ativos", value: active.toString(), sub: `de ${mockContracts.length} total`, icon: CheckCircle, accent: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
    { label: "Aguardando Assinatura", value: pending.toString(), sub: "pendentes", icon: Clock, accent: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    { label: "Vencem em 90 dias", value: expiringSoon.toString(), sub: "renovação necessária", icon: AlertTriangle, accent: "bg-destructive/10 text-destructive" },
    { label: "Valor Recorrente", value: `R$ ${(totalMRR / 1000).toFixed(1)}k`, sub: "mensal dos ativos", icon: FileText, accent: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(m => (
        <div key={m.label} className="glass-card rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent}`}>
              <m.icon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{m.value}</div>
            <div className="text-[11px] text-muted-foreground">{m.label}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{m.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContractMetrics;
