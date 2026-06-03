import DashboardLayout from "@/components/DashboardLayout";
import { Plug } from "lucide-react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";

const Integrations = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conectores</h1>
            <p className="text-sm text-muted-foreground">Contas externas e provedores de IA</p>
          </div>
        </div>

        <IntegrationsGrid
          providers={LLM_PROVIDERS}
          variant="card"
          title="Provedores de IA"
          subtitle="Conecte chaves de API dos modelos que seus agentes vão usar."
        />

        <IntegrationsGrid
          providers={SERVICE_PROVIDERS}
          variant="card"
          title="Conectores"
          subtitle="Conecte contas externas (Google, CRMs, mensageria) via OAuth seguro."
        />
      </div>
    </DashboardLayout>
  );
};

export default Integrations;
