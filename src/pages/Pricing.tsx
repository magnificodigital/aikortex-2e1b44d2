import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans, type Plan } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Sparkles, ArrowLeft } from "lucide-react";

const Pricing = () => {
  const [yearly, setYearly] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = usePlans();

  const handleSelect = (plan: Plan) => {
    if (!user) {
      navigate("/?auth=signup");
    } else {
      navigate("/settings?tab=subscription");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Planos Aikortex</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        {/* Title */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Escolha o plano ideal para sua agência
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Comece gratuitamente com um período de teste. Cancele quando quiser.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className={`text-sm ${!yearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Mensal
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span className={`text-sm ${yearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Anual
            </span>
            {yearly && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                ~17% off
              </Badge>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = yearly ? plan.price_yearly / 12 : plan.price_monthly;
              const totalYearly = plan.price_yearly;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 flex flex-col transition-shadow ${
                    plan.is_featured
                      ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                      : "border-border hover:shadow-md"
                  }`}
                >
                  {plan.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Sparkles className="w-3 h-3" /> Mais popular
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-2 mb-6">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        R${price.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                    {yearly && (
                      <p className="text-xs text-muted-foreground mt-1">
                        R${totalYearly.toFixed(0)}/ano cobrado anualmente
                      </p>
                    )}
                    {plan.trial_days > 0 && (
                      <p className="text-xs text-primary mt-1">
                        {plan.trial_days} dias grátis para testar
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.is_featured ? "default" : "outline"}
                    onClick={() => handleSelect(plan)}
                  >
                    {plan.trial_days > 0 ? "Começar teste grátis" : "Escolher plano"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
