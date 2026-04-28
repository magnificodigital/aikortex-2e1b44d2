import { AgentRecommendation } from "@/types/agent-builder";
import { ArrowRight, Settings2, Sparkles, Bot, Trash2, Loader2 } from "lucide-react";
import { useUserAgents, type UserAgent } from "@/hooks/use-user-agents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar8 from "@/assets/avatars/avatar-8.png";

interface Props {
  selected: AgentRecommendation | null;
  onSelect: (agent: AgentRecommendation) => void;
}

const TEMPLATE_CARDS = [
  {
    id: "sdr-1",
    name: "Agente SDR",
    description: "Qualifica leads inbound, responde em segundos e agenda reuniões com o time comercial 24/7.",
    avatar: avatar1,
    type: "SDR" as const,
  },
  {
    id: "sac-1",
    name: "Agente SAC",
    description: "Atende clientes automaticamente, resolve dúvidas e reduz tickets com suporte inteligente.",
    avatar: avatar3,
    type: "SAC" as const,
  },
];

const AVATAR_MAP: Record<string, string> = {
  "sdr-1": avatar1,
  "sac-1": avatar3,
};

const StepAgents = ({ selected, onSelect }: Props) => {
  const { agents, loading, deleteAgent } = useUserAgents();

  const handleSelect = (id: string, type: string, name: string, description: string) => {
    onSelect({
      id,
      type: type as any,
      name,
      objective: description,
      targetAudience: "",
      benefits: [],
      exampleConversation: [],
      selected: true,
    });
  };

  const handleSelectSaved = (agent: UserAgent) => {
    onSelect({
      id: agent.id,
      type: agent.agent_type as any,
      name: agent.name,
      objective: agent.description,
      targetAudience: "",
      benefits: [],
      exampleConversation: [],
      selected: true,
    });
  };

  const isCustomSelected = selected?.id === "custom-1";

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
      {/* My Agents Section */}
      {!loading && agents.length > 0 && (
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                Meus Agentes
              </span>
              <span className="text-xs text-muted-foreground">{agents.length} agente{agents.length > 1 ? "s" : ""} configurado{agents.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => {
              const active = selected?.id === agent.id;
              const avatarSrc = agent.avatar_url || AVATAR_MAP[agent.agent_type?.toLowerCase() === "sdr" ? "sdr-1" : agent.agent_type?.toLowerCase() === "bdr" ? "bdr-1" : agent.agent_type?.toLowerCase() === "sac" ? "sac-1" : "custom-1"] || avatar1;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={agent.id}
                  onClick={() => handleSelectSaved(agent)}
                  className={`text-left rounded-xl border p-5 transition-all duration-200 space-y-4 relative group ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAgent(agent.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <img
                    src={avatarSrc}
                    alt={agent.name}
                    loading="lazy"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {agent.description || "Sem descrição"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Badge variant={agent.status === "online" ? "default" : "secondary"} className="text-[10px] h-5">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${agent.status === "online" ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                      {agent.status === "online" ? "Online" : "Configurando"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{agent.agent_type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando agentes...
        </div>
      )}

      {/* Templates Section */}
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1.5 rounded-lg">Templates</span>
            <span className="text-xs text-muted-foreground">Comece com um agente pré-configurado</span>
          </div>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATE_CARDS.map((card) => {
            const active = selected?.id === card.id;
            return (
              <button
                key={card.id}
                onClick={() => handleSelect(card.id, card.type, card.name, card.description)}
                className={`text-left rounded-xl border p-5 transition-all duration-200 space-y-4 ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <img
                  src={card.avatar}
                  alt={card.name}
                  loading="lazy"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground">{card.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Template</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Custom Agent Section */}
      <div className="space-y-3 w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1.5 rounded-lg">Personalizado</span>
          <span className="text-xs text-muted-foreground">Crie do zero com total liberdade</span>
        </div>

        <button
          onClick={() => handleSelect("custom-1", "Custom", "Agente Personalizado", "Configure um agente sob medida com total liberdade: objetivos, canais, integrações e comportamento.")}
          className={`relative w-full text-left rounded-xl border p-6 transition-all duration-200 ${
            isCustomSelected
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-dashed border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
              <Settings2 className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Agente Personalizado</span>
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure um agente sob medida com total liberdade: defina objetivos, canais, integrações e comportamento sem restrições.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Todos os canais", "Todas as integrações", "Objetivos livres", "100% configurável"].map((tag) => (
                  <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Footer hint */}
      <div className="pt-2">
        <p className="text-xs text-muted-foreground text-center">
          Selecione um template ou crie um personalizado para continuar
        </p>
      </div>
    </div>
  );
};

export default StepAgents;
