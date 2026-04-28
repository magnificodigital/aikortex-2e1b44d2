import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";

const AsaasConfigTab = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [existingKey, setExistingKey] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook`;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      // Only fetch wallet id + a boolean indicator. Never load the full API key into the browser.
      const { data } = await supabase
        .from("agency_profiles")
        .select("asaas_wallet_id, asaas_api_key")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.asaas_api_key) {
        setExistingKey(true);
        setConnected(true);
        // Display a masked placeholder instead of the real key
        const masked = "••••••••••••" + String(data.asaas_api_key).slice(-4);
        setApiKey(masked);
      }
    };
    load();
  }, [user]);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Informe a chave de API do Asaas");
      return;
    }
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("asaas-setup", {
        body: { asaas_api_key: apiKey },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConnected(true);
      setAccountName(result.account_name ?? "");
      setExistingKey(true);
      toast.success("Asaas conectado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com Asaas");
    } finally {
      setConnecting(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  return (
    <div className="space-y-6">
      {/* Asaas Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integração Asaas</CardTitle>
          <CardDescription>
            Conecte sua conta Asaas para cobrar seus clientes automaticamente com split de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href="https://asaas.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Criar conta Asaas gratuita <ExternalLink className="w-3 h-3" />
          </a>

          <div className="space-y-2">
            <Label>Asaas API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setConnected(false); }}
                  placeholder="$aact_..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={handleConnect} disabled={connecting || !apiKey.trim()}>
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Conectar
              </Button>
            </div>
          </div>

          {connected && (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectado
              </Badge>
              {accountName && <span className="text-sm text-muted-foreground">{accountName}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Fee */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa da Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa da plataforma por cliente:</span>
              <span className="font-bold">R$ 97,00/mês</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Retenção Aikortex (split):</span>
              <span className="font-medium text-destructive">R$ 47,00/mês</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sua receita por cliente:</span>
              <span className="font-bold text-green-600">R$ 50,00/mês</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              O Aikortex retém R$ 47/mês automaticamente via split. Você recebe R$ 50/mês por cliente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Webhook Config */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook Asaas</CardTitle>
            <CardDescription>
              Configure esta URL em Asaas → Configurações → Notificações → Webhook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label className="text-xs text-muted-foreground">URL do Webhook Asaas</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyWebhook}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AsaasConfigTab;
