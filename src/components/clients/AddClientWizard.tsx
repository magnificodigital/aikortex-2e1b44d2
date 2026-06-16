import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, CheckCircle2, Copy, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useHasAsaasConfigured } from "@/hooks/use-has-asaas-configured";

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

// Alinhado ao Master v7.4 §3.2: Start (0) → Hack (1) → Growth (2)
const TIER_ORDER: Record<string, number> = { start: 0, hack: 1, growth: 2 };

const AddClientWizard = ({ open, onOpenChange, agencyId, customPricing, agencyTier, onSuccess }: Props) => {
  const navigate = useNavigate();
  const { hasAsaasConfigured } = useHasAsaasConfigured();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");

  // Client workspace access
  const [createWorkspaceAccess, setCreateWorkspaceAccess] = useState(true);
  // "invite" = cliente recebe email com link e cria a própria senha (default).
  // "manual" = agência define a senha agora e passa pro cliente fora da plataforma.
  const [accessMode, setAccessMode] = useState<"invite" | "manual">("invite");
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
      setCreateWorkspaceAccess(true); setAccessMode("invite"); setClientPassword("");
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

      // Parse structured payload — supabase-js v2 puts non-2xx body in res.error.context (Response not yet consumed).
      let payload: any = res.data;
      if (!payload && res.error) {
        const errorContext = (res.error as any)?.context;
        if (errorContext && typeof errorContext.json === "function") {
          try { payload = await errorContext.json(); } catch { payload = null; }
        }
      }

      if (payload?.action === "configure_asaas") {
        toast.error("Configure sua chave Asaas primeiro", {
          action: { label: "Configurar", onClick: () => navigate("/settings?tab=financeiro") },
        });
        setLoading(false);
        return;
      }
      if (res.error) throw new Error(payload?.error || res.error.message);
      if (payload?.error) { toast.error(typeof payload.error === "string" ? payload.error : "Erro ao criar cliente"); setLoading(false); return; }

      const clientId = payload.client?.id;
      setCreatedClientId(clientId);

      // Workspace access — invite (default) ou senha manual
      if (createWorkspaceAccess && email) {
        if (accessMode === "invite") {
          const inviteRes = await supabase.functions.invoke("client-invite", {
            body: { client_id: clientId },
          });
          if (inviteRes.error) {
            toast.warning("Cliente criado, mas o envio do convite falhou. Você pode reenviar pela lista.");
          }
        } else if (clientPassword) {
          const createRes = await supabase.functions.invoke("create-user", {
            body: {
              email,
              password: clientPassword,
              full_name: name,
              role: "client",
              tenant_type: "client",
            },
          });
          if (createRes.data?.user?.id) {
            await supabase
              .from("agency_clients")
              .update({ client_user_id: createRes.data.user.id, status: "active" })
              .eq("id", clientId);
          }
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
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessMode("invite")}
                      className={`text-left rounded-lg border p-3 transition-all ${
                        accessMode === "invite" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <p className="text-xs font-semibold">Enviar convite por email</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Cliente cria a própria senha</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessMode("manual")}
                      className={`text-left rounded-lg border p-3 transition-all ${
                        accessMode === "manual" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <p className="text-xs font-semibold">Definir senha agora</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Você passa as credenciais</p>
                    </button>
                  </div>
                  {accessMode === "manual" && (
                    <div>
                      <Label>Senha temporária *</Label>
                      <Input type="password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} placeholder="Senha de acesso" />
                      <p className="text-[10px] text-muted-foreground mt-1">O cliente usará o email acima + esta senha para entrar.</p>
                    </div>
                  )}
                  {accessMode === "invite" && (
                    <p className="text-[10px] text-muted-foreground">
                      Um email será enviado pro cliente com link único pra ele criar a própria senha.
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!name || !email || (createWorkspaceAccess && accessMode === "manual" && !clientPassword)}
              onClick={() => setStep(2)}
            >
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
            {!hasAsaasConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cobrança não configurada</AlertTitle>
                <AlertDescription>
                  Você ainda não configurou o Asaas. O cliente será criado sem cobrança automática.
                  Configure depois em Conta → Financeiro para ativar pagamentos.
                </AlertDescription>
              </Alert>
            )}
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
