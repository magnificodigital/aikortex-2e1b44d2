import { useEffect, useState } from "react";
import { BusinessContext } from "@/types/agent-builder";
import { Bot, Search, Users, Lightbulb, Layers, CheckCircle2 } from "lucide-react";

interface Props {
  context: BusinessContext;
  onComplete: () => void;
}

const ANALYSIS_STEPS = [
  { icon: Search, label: "Analisando seu negócio...", delay: 0 },
  { icon: Layers, label: "Entendendo sua empresa", delay: 1200 },
  { icon: Lightbulb, label: "Identificando produtos e serviços", delay: 2400 },
  { icon: Users, label: "Mapeando pontos de contato", delay: 3600 },
  { icon: Bot, label: "Desenhando agentes de IA", delay: 4800 },
  { icon: CheckCircle2, label: "Preparando recomendações", delay: 6000 },
];

const StepAnalysis = ({ context, onComplete }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timers = ANALYSIS_STEPS.map((step, i) =>
      setTimeout(() => setActiveIndex(i), step.delay)
    );
    const doneTimer = setTimeout(onComplete, 7500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-10 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse-glow">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Analisando {context.companyName}</h2>
        <p className="text-sm text-muted-foreground">Nosso motor de IA está estudando seu negócio</p>
      </div>

      <div className="w-full space-y-3">
        {ANALYSIS_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 ${
                isActive ? "bg-primary/10 text-primary" : isDone ? "bg-muted/50 text-muted-foreground" : "text-muted-foreground/30"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              ) : (
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "animate-pulse-glow" : ""}`} />
              )}
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepAnalysis;
