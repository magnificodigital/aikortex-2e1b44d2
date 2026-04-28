import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import AdminOverviewTab from "@/components/admin/AdminOverviewTab";
import AdminGestaoTab from "@/components/admin/AdminGestaoTab";
import AdminPlansTab from "@/components/admin/AdminPlansTab";
import AdminTemplatesTab from "@/components/admin/AdminTemplatesTab";
import AdminFinanceiroTab from "@/components/admin/AdminFinanceiroTab";
import AdminConfigTab from "@/components/admin/AdminConfigTab";
import AdminSupportTab from "@/components/admin/AdminSupportTab";
import AdminTutorialsTab from "@/components/admin/AdminTutorialsTab";

const TAB_LABELS: Record<string, string> = {
  overview: "Visão Geral",
  gestao: "Gestão",
  plans: "Planos",
  templates: "Templates",
  financeiro: "Financeiro",
  "api-keys": "Chaves de API",
  support: "Suporte",
  tutorials: "Tutoriais",
};

const AdminPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isPlatformOwner } = useAuth();
  const activeTab = searchParams.get("tab") || "overview";

  const [gestaoTier, setGestaoTier] = useState<string | undefined>();
  const [gestaoAgencyId, setGestaoAgencyId] = useState<string | undefined>();
  const [gestaoClientId, setGestaoClientId] = useState<string | undefined>();

  const navigateToTab = useCallback((tab: string, params?: Record<string, string>) => {
    setSearchParams({ tab });
    setGestaoTier(undefined);
    setGestaoAgencyId(undefined);
    setGestaoClientId(undefined);

    if (tab === "gestao") {
      if (params?.tier) setGestaoTier(params.tier);
      if (params?.agencyId) setGestaoAgencyId(params.agencyId);
      if (params?.clientId) setGestaoClientId(params.clientId);
    }
  }, [setSearchParams]);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Painel Aikortex</h1>
              <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Admin</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie agências, planos e configurações da plataforma.
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer" onClick={() => navigateToTab("overview")}>Admin</span>
          {activeTab !== "overview" && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{TAB_LABELS[activeTab] || activeTab}</span>
            </>
          )}
        </nav>

        {/* Tabs */}
        <Tabs value={activeTab} className="space-y-4">
          <TabsContent value="overview">
            <AdminOverviewTab onNavigate={navigateToTab} />
          </TabsContent>
          <TabsContent value="gestao">
            <AdminGestaoTab initialTier={gestaoTier} initialAgencyId={gestaoAgencyId} initialClientId={gestaoClientId} />
          </TabsContent>
          <TabsContent value="plans"><AdminPlansTab /></TabsContent>
          <TabsContent value="templates"><AdminTemplatesTab /></TabsContent>
          <TabsContent value="financeiro"><AdminFinanceiroTab /></TabsContent>
          {isPlatformOwner && (
            <TabsContent value="api-keys"><AdminConfigTab /></TabsContent>
          )}
          <TabsContent value="support"><AdminSupportTab /></TabsContent>
          <TabsContent value="tutorials"><AdminTutorialsTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPanel;
