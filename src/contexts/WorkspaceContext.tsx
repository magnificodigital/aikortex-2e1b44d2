import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AgencyClient {
  id: string;
  client_name: string;
  client_email: string | null;
  status: string | null;
  client_user_id?: string | null;
}

export interface ActiveWorkspace {
  type: "agency" | "client";
  id: string;
  name: string;
}

interface WorkspaceContextType {
  agencyName: string;
  agencyProfileId: string | null;
  clients: AgencyClient[];
  /** Cliente Sandbox da agência (status='sandbox'). Carregado separado pra
   * não poluir o dropdown de clientes reais. NULL se ainda não foi criado. */
  sandboxClient: AgencyClient | null;
  activeWorkspace: ActiveWorkspace;
  switchToAgency: () => void;
  switchToClient: (client: AgencyClient) => void;
  loading: boolean;
  refreshClients: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WS_ACTIVE_KEY = "aikortex_active_workspace";

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user, isPlatform, isClient } = useAuth();
  const [agencyName, setAgencyName] = useState("Meu Workspace");
  const [agencyProfileId, setAgencyProfileId] = useState<string | null>(null);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [sandboxClient, setSandboxClient] = useState<AgencyClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>({
    type: "agency", id: "", name: "Meu Workspace",
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        // CLIENTE logado: entra direto no modo-cliente da PRÓPRIA conta, usando
        // o mesmo app da agência (mesmas telas), escopado a ele.
        if (isClient) {
          const { data: myClient } = await supabase
            .from("agency_clients")
            .select("id, client_name, client_email, status")
            .eq("client_user_id", user.id)
            .maybeSingle();
          if (myClient) {
            setClients([myClient as AgencyClient]);
            setAgencyName(myClient.client_name || "Workspace");
            setActiveWorkspace({ type: "client", id: myClient.id, name: myClient.client_name || "Workspace" });
          }
          setLoading(false);
          return;
        }

        // Admin do SaaS: vê TODOS os workspaces (clientes de todas as agências).
        if (isPlatform) {
          const [{ data: allClients }, { data: allAgencies }] = await Promise.all([
            supabase.from("agency_clients").select("id, client_name, client_email, status, agency_id, client_user_id").in("status", ["active", "pending", "trial", "suspended"]).order("client_name"),
            supabase.from("agency_profiles").select("id, agency_name"),
          ]);
          const nameById = new Map((allAgencies || []).map((a: any) => [a.id, a.agency_name]));
          const loaded: AgencyClient[] = (allClients || []).map((c: any) => ({
            id: c.id,
            client_name: nameById.get(c.agency_id) ? `${c.client_name} · ${nameById.get(c.agency_id)}` : c.client_name,
            client_email: c.client_email,
            status: c.status,
            client_user_id: c.client_user_id,
          }));
          setClients(loaded);
          setAgencyName("Admin — todos");
          setAgencyProfileId(null);
          try {
            const saved = localStorage.getItem(WS_ACTIVE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.userId === user.id && parsed.type === "client" && loaded.find((c) => c.id === parsed.id)) {
                setActiveWorkspace({ type: "client", id: parsed.id, name: parsed.name });
                return;
              }
            }
          } catch { /* ignore */ }
          setActiveWorkspace({ type: "agency", id: "", name: "Admin — todos" });
          return;
        }

        const { data: agency } = await supabase
          .from("agency_profiles")
          .select("id, agency_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const name = agency?.agency_name || "Meu Workspace";
        setAgencyName(name);
        setAgencyProfileId(agency?.id ?? null);

        let loadedClients: AgencyClient[] = [];
        if (agency?.id) {
          const { data } = await supabase
            .from("agency_clients")
            .select("id, client_name, client_email, status")
            .eq("agency_id", agency.id)
            .in("status", ["active", "pending", "trial", "suspended"])
            .order("client_name");
          loadedClients = data ?? [];
          setClients(loadedClients);

          // Sandbox carregado separado pra não poluir o dropdown de
          // clientes reais. Acessado via sandboxClient prop.
          const { data: sandbox } = await supabase
            .from("agency_clients")
            .select("id, client_name, client_email, status")
            .eq("agency_id", agency.id)
            .eq("status", "sandbox")
            .maybeSingle();
          setSandboxClient(sandbox ?? null);
        }

        // Restore saved workspace — apenas se pertence ao user logado
        try {
          const saved = localStorage.getItem(WS_ACTIVE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.userId === user.id) {
              if (parsed.type === "client") {
                const exists = loadedClients.find(c => c.id === parsed.id);
                if (exists) {
                  setActiveWorkspace({ type: "client", id: parsed.id, name: parsed.name });
                  return;
                }
              }
            }
          }
        } catch { /* ignore */ }

        setActiveWorkspace({ type: "agency", id: agency?.id ?? "", name });
      } catch (err) {
        console.error("Error loading workspace:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, isPlatform, isClient]);

  const switchToAgency = useCallback(() => {
    const ws: ActiveWorkspace & { userId: string } = { type: "agency", id: agencyProfileId ?? "", name: agencyName, userId: user?.id ?? "" };
    setActiveWorkspace(ws);
    localStorage.setItem(WS_ACTIVE_KEY, JSON.stringify(ws));
  }, [agencyProfileId, agencyName, user]);

  const switchToClient = useCallback((client: AgencyClient) => {
    const ws: ActiveWorkspace & { userId: string } = { type: "client", id: client.id, name: client.client_name, userId: user?.id ?? "" };
    setActiveWorkspace(ws);
    localStorage.setItem(WS_ACTIVE_KEY, JSON.stringify(ws));
  }, [user]);

  const refreshClients = useCallback(async () => {
    if (!agencyProfileId) return;
    const { data } = await supabase
      .from("agency_clients")
      .select("id, client_name, client_email, status")
      .eq("agency_id", agencyProfileId)
      .in("status", ["active", "pending", "trial", "suspended"])
      .order("client_name");
    setClients(data ?? []);
  }, [agencyProfileId]);

  return (
    <WorkspaceContext.Provider value={{
      agencyName, agencyProfileId, clients, sandboxClient,
      activeWorkspace, switchToAgency, switchToClient,
      loading, refreshClients,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};
