import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X, Sparkles, Bot, MessageCircle, CreditCard, Rocket } from "lucide-react";

/**
 * Checklist de início da agência ("Comece por aqui"). Guia o primeiro acesso
 * até o primeiro agente no ar, com progresso auto-detectado. Some sozinho
 * quando tudo está feito (ou quando a agência dispensa).
 */

const LLM_PROVIDERS = ["openai", "anthropic", "gemini", "deepseek", "qwen", "kimi", "glm"];
const DISMISS_KEY = "aikortex_onboarding_dismissed";

interface StepState {
  hasKey: boolean;
  hasAgent: boolean;
  hasWhatsapp: boolean;
  hasAsaas: boolean;
  hasPublished: boolean;
  isAgency: boolean;
}

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [s, setS] = useState<StepState>({
    hasKey: false, hasAgent: false, hasWhatsapp: false, hasAsaas: false, hasPublished: false, isAgency: false,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [agentsRes, keysRes, agencyRes] = await Promise.all([
        supabase.from("user_agents").select("id, published_at").eq("user_id", user.id),
        supabase.from("user_api_keys").select("provider").eq("user_id", user.id),
        supabase.from("agency_profiles").select("asaas_connected").eq("user_id", user.id).maybeSingle(),
      ]);
      const agents = (agentsRes.data as any[]) || [];
      const providers = new Set(((keysRes.data as any[]) || []).map((k) => k.provider));
      setS({
        hasKey: LLM_PROVIDERS.some((p) => providers.has(p)),
        hasAgent: agents.length > 0,
        hasWhatsapp: providers.has("whatsapp_phone_number_id"),
        hasAsaas: !!(agencyRes.data as any)?.asaas_connected,
        hasPublished: agents.some((a) => a.published_at),
        isAgency: !!agencyRes.data,
      });
      setLoading(false);
    })();
  }, [user]);

  if (loading || dismissed || !s.isAgency) return null;

  const steps = [
    { key: "key", label: "Conecte sua chave de IA", desc: "Escolha o provedor (OpenAI, Anthropic, Gemini…) e cole sua chave.", icon: Sparkles, cta: "Conectar", done: s.hasKey, to: "/settings?tab=providers" },
    { key: "agent", label: "Crie seu primeiro agente", desc: "Com o assistente ou do zero.", icon: Bot, cta: "Criar agente", done: s.hasAgent, to: "/aikortex/agents" },
    { key: "whatsapp", label: "Conecte o WhatsApp", desc: "1 clique via Meta (coexistência — segue usando o app no celular).", icon: MessageCircle, cta: "Conectar", done: s.hasWhatsapp, to: "/settings?tab=channels" },
    { key: "asaas", label: "Conecte o Asaas", desc: "Pra cobrar seus clientes automaticamente.", icon: CreditCard, cta: "Conectar", done: s.hasAsaas, to: "/settings?tab=integrations" },
    { key: "publish", label: "Publique seu agente", desc: "Coloca o agente no ar pro cliente atender.", icon: Rocket, cta: "Ir pros agentes", done: s.hasPublished, to: "/aikortex/agents" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  if (doneCount === steps.length) return null;

  const next = steps.find((x) => !x.done);
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
  };

  return (
    <Card className="p-5 relative">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" aria-label="Dispensar">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-1">
        <Rocket className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Comece por aqui</h2>
        <span className="text-xs text-muted-foreground">{doneCount}/{steps.length} concluído</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">Poucos passos até seu primeiro agente no ar.</p>
      <Progress value={(doneCount / steps.length) * 100} className="h-1.5 mb-4" />
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.key} className={`flex items-center gap-3 rounded-lg border p-3 ${step.done ? "border-border/40 bg-card/30" : "border-border"}`}>
            {step.done
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              : <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{step.label}</p>
              {!step.done && <p className="text-xs text-muted-foreground">{step.desc}</p>}
            </div>
            {!step.done && (
              <Button size="sm" variant={step === next ? "default" : "outline"} onClick={() => navigate(step.to)} className="shrink-0">
                {step.cta}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
