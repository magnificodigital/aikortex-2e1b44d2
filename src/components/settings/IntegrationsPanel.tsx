import { Blocks, Webhook } from "lucide-react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";
import EmptyIntegrationSection from "@/components/settings/EmptyIntegrationSection";

export const IntegrationsPanel = () => {
  return (
    <div className="space-y-8">
      <IntegrationsGrid
        providers={LLM_PROVIDERS}
        title="Modelos de IA (LLMs)"
        subtitle="Conecte provedores de IA para potencializar seus agentes e apps."
      />

      <IntegrationsGrid
        providers={SERVICE_PROVIDERS}
        title="APIs & Serviços"
        subtitle="Conecte ferramentas externas para expandir as capacidades dos agentes."
      />

      <EmptyIntegrationSection
        icon={Blocks}
        title="MCPs"
        description="Conecte servidores MCP (Model Context Protocol) para estender o contexto do agente com fontes externas."
        actionLabel="Adicionar MCP"
      />

      <EmptyIntegrationSection
        icon={Webhook}
        title="Webhooks"
        description="Configure webhooks para receber e enviar eventos em tempo real entre o Aikortex e sistemas externos."
        actionLabel="Adicionar Webhook"
      />
    </div>
  );
};
