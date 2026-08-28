import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleAccess } from "@/hooks/use-module-access";

interface ModuleGateProps {
  moduleKey: string;
  children: ReactNode;
}

// Ordem do menu — pra escolher pra onde ir quando a página não está liberada.
const LANDING_ORDER: { path: string; key: string }[] = [
  { path: "/home", key: "stark.copilot" },
  { path: "/dashboard", key: "dashboard" },
  { path: "/aikortex/agents", key: "aikortex.agentes" },
  { path: "/aikortex/messages", key: "aikortex.mensagens" },
  { path: "/calls", key: "aikortex.ligacoes" },
  { path: "/apps", key: "aikortex.apps" },
  { path: "/clients", key: "gestao.clientes" },
  { path: "/aikortex/crm", key: "gestao.vendas" },
  { path: "/meetings", key: "gestao.reunioes" },
  { path: "/financial", key: "gestao.financeiro" },
  { path: "/team", key: "gestao.equipe" },
  { path: "/tasks", key: "gestao.tarefas" },
];

/**
 * Gateia uma página por módulo (respeita o painel admin: master global +
 * has_access do tier). Quando não liberado, NÃO mostra tela de "bloqueado" —
 * redireciona pro primeiro item acessível (a função simplesmente não aparece).
 */
const ModuleGate = ({ moduleKey, children }: ModuleGateProps) => {
  const { canAccess, isLoading } = useModuleAccess();
  const navigate = useNavigate();
  const denied = !isLoading && !canAccess(moduleKey);

  useEffect(() => {
    if (!denied) return;
    const first = LANDING_ORDER.find((x) => x.key !== moduleKey && canAccess(x.key));
    navigate(first ? first.path : "/settings", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied]);

  if (isLoading || denied) return null;
  return <>{children}</>;
};

export default ModuleGate;
