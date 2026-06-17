import { ReactNode } from "react";
import { useActiveClient } from "@/hooks/use-active-client";
import DashboardLayout from "@/components/DashboardLayout";
import EmptyClientGestao from "@/components/shared/EmptyClientGestao";

interface Props {
  section: string;
  children: ReactNode;
}

// Quando o switcher está em modo "Cliente X", páginas de Gestão (Clientes,
// Vendas, Financeiro, Equipe, Tarefas) devem mostrar vazio em vez de dados
// da agência — esse cliente ainda não é multi-tenant nessas tabelas.
const ClientGestaoGuard = ({ section, children }: Props) => {
  const { isAgencyMode, activeClientName } = useActiveClient();
  if (!isAgencyMode) {
    return (
      <DashboardLayout>
        <EmptyClientGestao section={section} clientName={activeClientName || "cliente"} />
      </DashboardLayout>
    );
  }
  return <>{children}</>;
};

export default ClientGestaoGuard;
