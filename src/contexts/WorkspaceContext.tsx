import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AgencyClient {
  id: string;
  client_name: string;
  client_email: string | null;
  status: string | null;
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
  activeWorkspace: ActiveWorkspace;
  switchToAgency: () => void;
  switchToClient: (client: AgencyClient) => void;
  loading: boolean;
  refreshClients: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WS_ACTIVE_KEY = "aikortex_active_workspace";

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState("Meu Workspace");
  const [agencyProfileId, setAgencyProfileId] = useState<string | null>(null);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>({
    type: "agency", id: "", name: "Meu Workspace",
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
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
            .eq("status", "active")
            .order("client_name");
          loadedClients = data ?? [];
          setClients(loadedClients);
        }

        // Restore saved workspace
        try {
          const saved = localStorage.getItem(WS_ACTIVE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.type === "client") {
              const exists = loadedClients.find(c => c.id === parsed.id);
              if (exists) {
                setActiveWorkspace({ type: "client", id: parsed.id, name: parsed.name });
                return;
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
  }, [user]);

  const switchToAgency = useCallback(() => {
    const ws: ActiveWorkspace = { type: "agency", id: agencyProfileId ?? "", name: agencyName };
    setActiveWorkspace(ws);
    localStorage.setItem(WS_ACTIVE_KEY, JSON.stringify(ws));
  }, [agencyProfileId, agencyName]);

  const switchToClient = useCallback((client: AgencyClient) => {
    const ws: ActiveWorkspace = { type: "client", id: client.id, name: client.client_name };
    setActiveWorkspace(ws);
    localStorage.setItem(WS_ACTIVE_KEY, JSON.stringify(ws));
  }, []);

  const refreshClients = useCallback(async () => {
    if (!agencyProfileId) return;
    const { data } = await supabase
      .from("agency_clients")
      .select("id, client_name, client_email, status")
      .eq("agency_id", agencyProfileId)
      .eq("status", "active")
      .order("client_name");
    setClients(data ?? []);
  }, [agencyProfileId]);

  return (
    <WorkspaceContext.Provider value={{
      agencyName, agencyProfileId, clients,
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
