import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";

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
        variant="card"
        title="Conectores"
        subtitle="Conecte contas externas (Google, CRMs, mensageria) que os agentes podem usar durante a conversa."
      />

      {/* MCPs e Webhooks: escondidos até estarem no roadmap (mesmo padrão do AgentRightPanel). */}
    </div>
  );
};
