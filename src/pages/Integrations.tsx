import DashboardLayout from "@/components/DashboardLayout";
import { Plug } from "lucide-react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";

const Integrations = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
            <p className="text-sm text-muted-foreground">Conexão com plataformas externas</p>
          </div>
        </div>

        <IntegrationsGrid
          providers={LLM_PROVIDERS}
          title="Modelos de IA (LLMs)"
          subtitle="Conecte suas chaves de API para utilizar modelos de IA nos seus agentes e apps."
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
        />

        <IntegrationsGrid
          providers={SERVICE_PROVIDERS}
          title="Serviços & Ferramentas"
          subtitle="Conecte ferramentas externas para expandir as capacidades dos agentes."
          gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
        />
      </div>
    </DashboardLayout>
  );
};

export default Integrations;
