import { QualificationTier } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Filter } from "lucide-react";

interface Props {
  tiers: QualificationTier[];
  onChange: (tiers: QualificationTier[]) => void;
  onNext: () => void;
}

const StepQualification = ({ tiers, onChange, onNext }: Props) => {
  const updateTier = (id: string, field: keyof QualificationTier, value: string) => {
    onChange(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Filter className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Qualificação de leads</h2>
        <p className="text-sm text-muted-foreground">Defina como seu agente vai classificar os leads</p>
      </div>

      <div className="space-y-4">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${tier.color}`}>
                {i + 1}
              </div>
              <Input
                value={tier.name}
                onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                className="font-semibold"
              />
            </div>
            <Textarea
              value={tier.description}
              onChange={(e) => updateTier(tier.id, "description", e.target.value)}
              rows={2}
              className="text-xs"
            />
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

export default StepQualification;
