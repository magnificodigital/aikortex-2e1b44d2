import { DeployChannel, DEPLOY_CHANNELS, AgentType, CHANNELS_BY_AGENT_TYPE } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

interface Props {
  selected: DeployChannel[];
  onToggle: (ch: DeployChannel) => void;
  onNext: () => void;
  onBack: () => void;
  agentType: AgentType | null;
}

const CHANNEL_LOGOS: Record<DeployChannel, string> = {
  whatsapp: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
  instagram: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
  tiktok: "https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png",
  facebook: "https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png",
  linkedin: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
  google_maps: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg",
  website: "",
  email: "",
};

const StepChannels = ({ selected, onToggle, onNext, onBack, agentType }: Props) => {
  const allowedChannels = agentType ? CHANNELS_BY_AGENT_TYPE[agentType] : DEPLOY_CHANNELS.map(c => c.value);
  const filteredChannels = DEPLOY_CHANNELS.filter(ch => allowedChannels.includes(ch.value));

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Canais</h2>
        <p className="text-sm text-muted-foreground">Onde seu agente vai operar?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredChannels.map((ch) => {
          const isSelected = selected.includes(ch.value);
          const logo = CHANNEL_LOGOS[ch.value];
          return (
            <div
              key={ch.value}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
              }`}
            >
              {logo && (
                <img
                  src={logo}
                  alt={ch.label}
                  className="w-8 h-8 rounded-lg object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <span className="text-sm font-semibold text-foreground flex-1">{ch.label}</span>
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => onToggle(ch.value)}
                className="shrink-0 text-xs h-8 gap-1.5"
              >
                {isSelected ? (
                  <><Check className="w-3 h-3" /> Conectado</>
                ) : (
                  "Conectar"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={selected.length === 0} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StepChannels;
