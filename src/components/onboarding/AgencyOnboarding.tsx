import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Sparkles, ArrowRight, CheckCircle2, Upload, Loader2, Eye, EyeOff, ExternalLink,
} from "lucide-react";

interface Props {
  onComplete: () => void;
}

type Template = {
  id: string;
  name: string;
  slug: string;
  platform_price_monthly: number;
  min_tier: string;
};

const AgencyOnboarding = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [agencyName, setAgencyName] = useState("");

  // Step 2
  const [asaasKey, setAsaasKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [asaasConnected, setAsaasConnected] = useState(false);

  // Step 3
  const [templates, setTemplates] = useState<Template[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("platform_templates").select("id, name, slug, platform_price_monthly, min_tier")
      .eq("is_active", true).eq("min_tier", "starter")
      .then(({ data }) => {
        if (data) {
          setTemplates(data as Template[]);
          const init: Record<string, string> = {};
          data.forEach((t: any) => { init[t.slug] = String(t.platform_price_monthly * 2); });
          setPrices(init);
        }
      });
  }, []);

  const handleStep1 = async () => {
    if (!agencyName.trim() || !user) return;
    setLoading(true);
    await supabase.from("agency_profiles").upsert({
      user_id: user.id,
      agency_name: agencyName,
    }, { onConflict: "user_id" });
    setLoading(false);
    setStep(2);
  };

  const handleConnectAsaas = async () => {
    if (!asaasKey.trim()) return;
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("asaas-setup", {
        body: { asaas_api_key: asaasKey },
      });
      if (res.data?.error) { toast.error(res.data.error); setLoading(false); return; }
      setAsaasConnected(true);
      toast.success("Asaas conectado!");
    } catch {
      toast.error("Erro ao conectar");
    }
    setLoading(false);
  };

  const handleStep3 = async () => {
    if (!user) return;
    setLoading(true);
    const custom: Record<string, number> = {};
    Object.entries(prices).forEach(([slug, val]) => { custom[slug] = Number(val); });
    await supabase.from("agency_profiles").update({ custom_pricing: custom }).eq("user_id", user.id);
    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Sparkles className="w-10 h-10 text-primary mx-auto" />
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao Aikortex!</h1>
              <p className="text-sm text-muted-foreground">Configure sua agência em 3 passos</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-foreground">Configure sua cobrança</h1>
              <p className="text-sm text-muted-foreground">Conecte o Asaas para cobrar seus clientes</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-foreground">Configure seus preços</h1>
              <p className="text-sm text-muted-foreground">Defina quanto cobrar dos seus clientes</p>
            </>
          )}
        </div>

        <Progress value={(step / 3) * 100} className="h-2" />

        {/* Step 1 */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div><Label>Nome da agência *</Label><Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Minha Agência" /></div>
              <Button className="w-full" onClick={handleStep1} disabled={!agencyName.trim() || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <a href="https://asaas.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                Criar conta Asaas gratuita <ExternalLink className="w-3 h-3" />
              </a>
              <div>
                <Label>Asaas API Key</Label>
                <div className="relative">
                  <Input type={showKey ? "text" : "password"} value={asaasKey} onChange={(e) => setAsaasKey(e.target.value)} placeholder="$aact_..." />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {asaasConnected && (
                <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="w-4 h-4" /> Conectado com sucesso</div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                  Pular por agora
                </Button>
                <Button className="flex-1" onClick={asaasConnected ? () => setStep(3) : handleConnectAsaas} disabled={loading && !asaasConnected}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {asaasConnected ? "Continuar" : "Conectar Asaas"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              {templates.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t.name}</Label>
                    <span className="text-xs text-muted-foreground">Custo: R$ {t.platform_price_monthly.toFixed(0)}</span>
                  </div>
                  <Input
                    type="number"
                    value={prices[t.slug] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [t.slug]: e.target.value }))}
                    min={t.platform_price_monthly + 1}
                  />
                  {Number(prices[t.slug]) > t.platform_price_monthly && (
                    <p className="text-xs text-green-600">
                      Lucro: R$ {(Number(prices[t.slug]) - t.platform_price_monthly).toFixed(0)}/mês por cliente
                    </p>
                  )}
                </div>
              ))}
              <Button className="w-full" onClick={handleStep3} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Finalizar configuração
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgencyOnboarding;
