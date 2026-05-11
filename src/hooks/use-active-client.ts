import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Thin wrapper over WorkspaceContext exposing a client-centric API.
 * "Todos os clientes" === workspace da agência (type: "agency").
 */
export function useActiveClient() {
  const { activeWorkspace, clients, switchToAgency, switchToClient, loading } = useWorkspace();

  const isAllClients = activeWorkspace.type === "agency";
  const activeClient = isAllClients
    ? null
    : clients.find((c) => c.id === activeWorkspace.id) ?? null;

  const setActiveClientId = (id: string | null) => {
    if (id === null) {
      switchToAgency();
      return;
    }
    const client = clients.find((c) => c.id === id);
    if (client) switchToClient(client);
  };

  return {
    activeClientId: isAllClients ? null : activeWorkspace.id,
    activeClient,
    activeClientName: activeWorkspace.name,
    isAllClients,
    isLoading: loading,
    clients,
    setActiveClientId,
  };
}
