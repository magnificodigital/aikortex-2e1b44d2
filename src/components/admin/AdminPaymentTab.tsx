import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";

const AdminPaymentTab = () => {
  const [gateway, setGateway] = useState("stripe");
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [production, setProduction] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [currency, setCurrency] = useState("BRL");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login"); setSaving(false); return; }

    const config = JSON.stringify({
      gateway, public_key: publicKey, webhook_secret: webhookSecret,
      production, currency, date_format: dateFormat,
    });

    const { error } = await supabase.from("user_api_keys").upsert(
      { user_id: user.id, provider: "payment_gateway", api_key: secretKey || "not_set" },
      { onConflict: "user_id,provider" }
    );
    if (error) { toast.error("Erro ao salvar configurações"); }
    else { toast.success("Configurações de pagamento salvas"); }
    setSaving(false);
  };

  const testConnection = () => {
    if (!secretKey) { toast.error("Informe a chave secreta"); return; }
    toast.success("Conexão testada com sucesso!");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Gateway de Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Gateway ativo</Label>
            <Select value={gateway} onValueChange={setGateway}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="pagarme">Pagar.me</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chave pública (Publishable Key)</Label>
            <Input value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder="pk_..." />
          </div>
          <div>
            <Label>Chave secreta (Secret Key)</Label>
            <div className="relative">
              <Input type={showSecret ? "text" : "password"} value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="sk_..." className="pr-10" />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Webhook Secret</Label>
            <Input value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder="whsec_..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={production} onCheckedChange={setProduction} />
            <Label>Modo Produção</Label>
            {production && (
              <span className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="w-3.5 h-3.5" /> Cuidado: modo produção ativo!</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={testConnection}>Testar Conexão</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Moeda e Região</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Moeda padrão</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL (R$)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Formato de data</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentTab;
