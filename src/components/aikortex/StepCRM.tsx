import { CRMProvider, CRM_PROVIDERS } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Database } from "lucide-react";

interface Props {
  selected: CRMProvider | null;
  onSelect: (crm: CRMProvider | null) => void;
  onNext: () => void;
}

const StepCRM = ({ selected, onSelect, onNext }: Props) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Database className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Integração com CRM</h2>
        <p className="text-sm text-muted-foreground">Sincronize leads e dados de conversas com seu CRM</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CRM_PROVIDERS.map((crm) => {
          const isSelected = selected === crm.value;
          return (
            <button
              key={crm.value}
              onClick={() => onSelect(isSelected ? null : crm.value)}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-sm font-semibold text-foreground flex-1">{crm.label}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? "bg-primary border-primary" : "border-border"
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
          Pular por agora
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StepCRM;
