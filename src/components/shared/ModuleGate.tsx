import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleAccess } from "@/hooks/use-module-access";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

const MODULE_LABELS: Record<string, string> = {
  "aikortex.agentes": "Agentes",
  "aikortex.flows": "Flows",
  "aikortex.apps": "Apps",
  "aikortex.templates": "Templates",
  "aikortex.mensagens": "Mensagens",
  "aikortex.disparos": "Disparos",
  "gestao.clientes": "Clientes",
  "gestao.contratos": "Contratos",
  "gestao.vendas": "Vendas",
  "gestao.crm": "CRM",
  "gestao.reunioes": "Reuniões",
  "gestao.financeiro": "Financeiro",
  "gestao.equipe": "Equipe",
  "gestao.tarefas": "Tarefas",
};

interface ModuleGateProps {
  moduleKey: string;
  children: ReactNode;
}

const ModuleGate = ({ moduleKey, children }: ModuleGateProps) => {
  const { canAccess, isLoading, tier } = useModuleAccess();
  const navigate = useNavigate();

  if (isLoading) return null;

  if (!canAccess(moduleKey)) {
    const label = MODULE_LABELS[moduleKey] ?? moduleKey;
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Módulo {label} indisponível
            </h2>
            <p className="text-sm text-muted-foreground">
              Este módulo não está disponível no seu plano atual.
            </p>
            <Badge variant="outline" className="text-xs capitalize">
              Seu tier: {tier}
            </Badge>
            <Button onClick={() => navigate("/partners?tab=tiers")}>
              Ver como evoluir
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
};

export default ModuleGate;
