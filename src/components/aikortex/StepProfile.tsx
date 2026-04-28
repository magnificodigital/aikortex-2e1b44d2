import { AgentProfile } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserCircle, Target, MessageSquare, BookOpen, Palette, Shield, Lock } from "lucide-react";

interface Props {
  profile: AgentProfile;
  onNext: () => void;
}

const SECTIONS: { key: keyof AgentProfile; label: string; icon: typeof UserCircle }[] = [
  { key: "persona", label: "Persona", icon: UserCircle },
  { key: "primaryGoal", label: "Objetivo principal", icon: Target },
  { key: "conversationFlow", label: "Fluxo de conversa", icon: MessageSquare },
  { key: "instructions", label: "Instruções", icon: BookOpen },
  { key: "communicationStyle", label: "Estilo de comunicação", icon: Palette },
  { key: "safetyGuidelines", label: "Diretrizes de segurança", icon: Shield },
  { key: "constraints", label: "Restrições operacionais", icon: Lock },
];

const StepProfile = ({ profile, onNext }: Props) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <UserCircle className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Perfil do agente</h2>
        <p className="text-sm text-muted-foreground">O perfil completo do seu agente foi gerado automaticamente</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{profile[key]}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StepProfile;
