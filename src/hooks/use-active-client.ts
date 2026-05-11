import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Thin wrapper over WorkspaceContext exposing a client-centric API.
 * Two modes:
 *   - isAgencyMode === true  → operando "Meu Workspace" (camada de operação)
 *   - isAgencyMode === false → dentro do workspace de um cliente (camada de produção)
 */
export function useActiveClient() {
  const { activeWorkspace, clients, switchToAgency, switchToClient, loading } = useWorkspace();

  const isAgencyMode = activeWorkspace.type === "agency";
  const activeClient = isAgencyMode
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
    activeClientId: isAgencyMode ? null : activeWorkspace.id,
    activeClient,
    activeClientName: activeWorkspace.name,
    isAgencyMode,
    isLoading: loading,
    clients,
    setActiveClientId,
  };
}
