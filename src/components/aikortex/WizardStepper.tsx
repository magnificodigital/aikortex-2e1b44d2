import { WIZARD_STEPS, WizardStep } from "@/types/agent-builder";
import { Check } from "lucide-react";

interface Props {
  currentStep: WizardStep;
}

const WizardStepper = ({ currentStep }: Props) => {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2">
      {WIZARD_STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? "bg-primary text-primary-foreground"
                : isDone
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            }`}>
              {isDone && <Check className="w-3 h-3" />}
              {step.label}
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < currentIndex ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WizardStepper;
