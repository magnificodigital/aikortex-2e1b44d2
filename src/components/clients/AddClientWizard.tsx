import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, CheckCircle2, Copy, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agencyId?: string;
  customPricing?: Record<string, number> | null;
  agencyTier: string;
  onSuccess: () => void;
}

type Template = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  platform_price_monthly: number;
  min_tier: string;
};

const TIER_ORDER: Record<string, number> = { starter: 0, explorer: 1, hack: 2 };

const AddClientWizard = ({ open, onOpenChange, agencyId, customPricing, agencyTier, onSuccess }: Props) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");

  // Client workspace access
  const [createWorkspaceAccess, setCreateWorkspaceAccess] = useState(false);
  const [clientPassword, setClientPassword] = useState("");

  // Step 2
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Step 4
  const [paymentLink, setPaymentLink] = useState("");
  const [createdClientId, setCreatedClientId] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1); setName(""); setEmail(""); setPhone(""); setDocument("");
      setSelected(new Set()); setPaymentLink(""); setCreatedClientId("");
      setCreateWorkspaceAccess(false); setClientPassword("");
      supabase.from("platform_templates").select("*").eq("is_active", true).then(({ data }) => {
        if (data) setTemplates(data.filter((t: any) => TIER_ORDER[agencyTier] >= TIER_ORDER[t.min_tier]) as Template[]);
      });
    }
  }, [open, agencyTier]);

  const getPrice = (t: Template) => customPricing?.[t.slug] ?? null;

  const selectedTemplates = templates.filter((t) => selected.has(t.id));
  const allPriced = selectedTemplates.every((t) => getPrice(t) !== null);
  const monthlyTotal = selectedTemplates.reduce((sum, t) => sum + (getPrice(t) ?? 0), 0);

  const handleCreate = async () => {
    if (!agencyId) { toast.error("Perfil de agência não encontrado"); return; }
    setLoading(true);
    try {
      // Create client
      const res = await supabase.functions.invoke("asaas-create-client", {
        body: { client_name: name, client_email: email, client_phone: phone, client_document: document },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) { toast.error(typeof res.data.error === "string" ? res.data.error : "Erro ao criar cliente"); setLoading(false); return; }

      const clientId = res.data.client?.id;
      setCreatedClientId(clientId);

      // Optionally create workspace access for client
      if (createWorkspaceAccess && email && clientPassword) {
        const createRes = await supabase.functions.invoke("create-user", {
          body: {
            email,
            password: clientPassword,
            full_name: name,
            role: "client_owner",
            tenant_type: "client",
          },
        });
        if (createRes.data?.user?.id) {
          // Link client_user_id
          await supabase.from("agency_clients").update({ client_user_id: createRes.data.user.id }).eq("id", clientId);
        }
      }

      // Subscribe templates
      for (const t of selectedTemplates) {
        await supabase.functions.invoke("asaas-subscribe-template", {
          body: { client_id: clientId, template_id: t.id },
        });
      }

      toast.success("Cliente cadastrado com sucesso!");
      setStep(4);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Adicionar Cliente — Dados"}
            {step === 2 && "Escolher Templates"}
            {step === 3 && "Revisão e Confirmação"}
            {step === 4 && "Cliente Cadastrado!"}
          </DialogTitle>
          {step < 4 && <p className="text-xs text-muted-foreground">Passo {step} de 3</p>}
        </DialogHeader>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div><Label>Nome completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" /></div>
            <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" /></div>
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" /></div>
            <div><Label>CPF/CNPJ</Label><Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00" /></div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Criar acesso ao workspace</p>
                  <p className="text-xs text-muted-foreground">O cliente poderá acessar seu próprio painel</p>
                </div>
                <Switch checked={createWorkspaceAccess} onCheckedChange={setCreateWorkspaceAccess} />
              </div>
              {createWorkspaceAccess && (
                <div>
                  <Label>Senha temporária *</Label>
                  <Input type="password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} placeholder="Senha de acesso" />
                  <p className="text-[10px] text-muted-foreground mt-1">O cliente usará o email acima + esta senha para entrar.</p>
                </div>
              )}
            </div>

            <Button className="w-full" disabled={!name || !email || (createWorkspaceAccess && !clientPassword)} onClick={() => setStep(2)}>
              Próximo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Quais templates este cliente vai usar?</p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {templates.map((t) => {
                const price = getPrice(t);
                const isSelected = selected.has(t.id);
                return (
                  <Card key={t.id} className={`transition-all ${isSelected ? "border-primary" : ""}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                        {price !== null ? (
                          <p className="text-xs font-bold text-foreground mt-1">R$ {price.toFixed(0)}/mês</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Configure o preço primeiro
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={isSelected}
                        disabled={price === null}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          v ? next.add(t.id) : next.delete(t.id);
                          setSelected(next);
                        }}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button className="flex-1" disabled={selected.size === 0 || !allPriced} onClick={() => setStep(3)}>
                Próximo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <Card><CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{email} · {phone}</p>
            </CardContent></Card>

            <div className="space-y-2">
              {selectedTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{t.name}</span>
                  <span className="font-bold">R$ {(getPrice(t) ?? 0).toFixed(0)}/mês</span>
                </div>
              ))}
              <div className="border-t pt-2 flex items-center justify-between text-sm font-bold">
                <span>Total mensal</span>
                <span className="text-primary">R$ {monthlyTotal.toFixed(0)}/mês</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O cliente receberá um link de pagamento via email/WhatsApp após o cadastro.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Cadastrar cliente
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-bold text-foreground">Cliente cadastrado com sucesso!</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {createdClientId && (
                <Button className="flex-1" onClick={() => { onOpenChange(false); window.location.href = `/clients/${createdClientId}`; }}>
                  Ver cliente
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddClientWizard;
