import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Puzzle } from "lucide-react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";
import { ExternalTool, AgentType, TOOLS_BY_AGENT_TYPE } from "@/types/agent-builder";

interface Props {
  selected: ExternalTool[];
  onToggle: (tool: ExternalTool) => void;
  onNext: () => void;
  onBack: () => void;
  agentType: AgentType | null;
}

const StepIntegrations = ({ selected, onToggle, onNext, onBack, agentType }: Props) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Puzzle className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Integrações</h2>
        <p className="text-sm text-muted-foreground">Conecte suas chaves de API para utilizar nos agentes.</p>
      </div>

      <IntegrationsGrid
        providers={LLM_PROVIDERS}
        title="Modelos de IA (LLMs)"
        subtitle="Conecte provedores de IA para potencializar seu agente."
      />

      <IntegrationsGrid
        providers={SERVICE_PROVIDERS}
        title="Serviços & Ferramentas"
        subtitle="Conecte ferramentas externas para expandir as capacidades."
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StepIntegrations;
