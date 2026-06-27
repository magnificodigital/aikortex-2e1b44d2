import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Rocket, UserPlus, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { evaluateReadiness } from "@/lib/agent-readiness";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agentId: string;
  agentName: string;
  /** Config atual do agente — usado pra avaliar readiness checks */
  currentConfig?: Record<string, any> | null;
  onPublished?: () => void;
}

interface AgencyClient {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_document: string | null;
}

const DEFAULT_PRICE_CENTS = 99700;

/**
 * Diferente do PublishAgentDialog.tsx (que publica uma VERSÃO do config).
 * Este aqui PUBLICA PRO CLIENTE FINAL — ativa cobrança recorrente via Asaas
 * Subscription com split, ALÉM de fazer o lock down da v1. Master v7.4 §3.
 */
export default function PublishForClientDialog({
  open, onOpenChange, agentId, agentName, currentConfig, onPublished,
}: Props) {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [priceCents, setPriceCents] = useState<number>(DEFAULT_PRICE_CENTS);
  const [ackWarnings, setAckWarnings] = useState(false);

  // Quando o dialog abre: carrega lista de clientes da agencia + preco do template.
  useEffect(() => {
    if (!open || !agentId) return;
    let cancelled = false;
    (async () => {
      setLoadingClients(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: agency } = await supabase
        .from("agency_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (agency?.id && !cancelled) {
        const { data } = await supabase
          .from("agency_clients")
          .select("id, client_name, client_email, client_phone, client_document")
          .eq("agency_id", agency.id)
          .eq("status", "active")
          .order("client_name");
        if (!cancelled) setClients((data as AgencyClient[]) ?? []);
      }

      const { data: agent } = await supabase
        .from("user_agents")
        .select("template_id")
        .eq("id", agentId)
        .maybeSingle();
      const tplId = (agent as any)?.template_id;
      if (tplId && !cancelled) {
        const { data: tpl } = await supabase
          .from("agent_templates")
          .select("retail_price_cents")
          .eq("id", tplId)
          .maybeSingle();
        if (!cancelled && (tpl as any)?.retail_price_cents) {
          setPriceCents((tpl as any).retail_price_cents);
        }
      }

      if (!cancelled) setLoadingClients(false);
    })();
    return () => { cancelled = true; };
  }, [open, agentId]);

  const priceFmt = (priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const checks = useMemo(() => evaluateReadiness(currentConfig ?? null), [currentConfig]);
  const criticalFailing = checks.filter((c) => c.level === "critical" && !c.pass);
  const recommendedFailing = checks.filter((c) => c.level === "recommended" && !c.pass);
  const readinessOk = criticalFailing.length === 0 && (recommendedFailing.length === 0 || ackWarnings);

  const handleClose = (o: boolean) => {
    if (!o) {
      setSelectedClientId("");
      setAckWarnings(false);
    }
    onOpenChange(o);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientOk = !!selectedClient
    && !!selectedClient.client_document
    && !!selectedClient.client_email;
  const canSubmit = readinessOk && clientOk && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !selectedClient) return;
    setSubmitting(true);
    try {
      // 1) Cria assinatura Asaas + split + persiste vinculo no agente
      const { data, error } = await supabase.functions.invoke("client-agent-subscribe", {
        body: {
          agent_id: agentId,
          client_info: {
            name: selectedClient.client_name,
            cpf_cnpj: (selectedClient.client_document || "").replace(/\D/g, ""),
            email: selectedClient.client_email,
            phone: (selectedClient.client_phone || "").replace(/\D/g, ""),
          },
        },
      });

      if (error || (data as any)?.error) {
        const msg = (data as any)?.message
          || (error as Error)?.message
          || "Falha ao publicar agente";
        toast.error(msg, { duration: 8000 });
        setSubmitting(false);
        return;
      }

      // 2) Lock down da v1 — registra snapshot do config no agent_versions.
      //    Se falhar, o agente ja foi vinculado e cobranca ativada; rolar o
      //    Asaas atras seria pior. Log e segue.
      try {
        await (supabase as any).rpc("publish_agent_version", {
          p_agent_id: agentId,
          p_label: `Publicação inicial — ${selectedClient.client_name}`,
          p_notes: null,
        });
      } catch (e) {
        console.error("[PublishForClientDialog] publish_agent_version falhou (subscription ja criada):", e);
      }

      const d = data as { next_due_date: string };
      toast.success(
        `Agente publicado pra ${selectedClient.client_name}! ` +
        `Primeira cobrança em ${new Date(d.next_due_date).toLocaleDateString("pt-BR")}.`,
        { duration: 8000 },
      );
      onPublished?.();
      handleClose(false);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Publicar {agentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Readiness checklist */}
          {checks.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold flex items-center gap-2">
                Prontidão pra produção
                {criticalFailing.length === 0 ? (
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    Pronto
                  </span>
                ) : (
                  <span className="text-[10px] font-normal text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                    {criticalFailing.length} bloqueando
                  </span>
                )}
              </h4>
              <div className="space-y-1">
                {checks.map((c) => {
                  const failed = !c.pass;
                  const icon = c.pass ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : c.level === "critical" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  );
                  return (
                    <div
                      key={c.key}
                      className={`flex items-start gap-2 px-2 py-1.5 rounded-md ${
                        failed && c.level === "critical"
                          ? "bg-destructive/5 border border-destructive/20"
                          : failed
                          ? "bg-amber-500/5 border border-amber-500/20"
                          : "bg-card/30 border border-border/40"
                      }`}
                    >
                      {icon}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] ${c.pass ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                          {c.label}
                        </p>
                        {failed && c.hint && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.hint}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {criticalFailing.length === 0 && recommendedFailing.length > 0 && (
                <label className="flex items-start gap-2 mt-2 px-2 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ackWarnings}
                    onChange={(e) => setAckWarnings(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-[11px]">
                    Publicar mesmo assim — sei que {recommendedFailing.length} item{recommendedFailing.length > 1 ? "s" : ""} recomendado{recommendedFailing.length > 1 ? "s" : ""} {recommendedFailing.length > 1 ? "estão" : "está"} faltando
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Preço */}
          <div className="rounded-lg border border-border bg-primary/5 p-4">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wider">Mensalidade</p>
            <p className="text-2xl font-bold text-foreground">
              {priceFmt}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando clientes…
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </p>
                <Button asChild size="sm" variant="outline" className="gap-1.5" onClick={() => handleClose(false)}>
                  <Link to="/clients">
                    <UserPlus className="w-3.5 h-3.5" /> Cadastrar cliente
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex flex-col">
                          <span className="text-sm">{c.client_name}</span>
                          {c.client_email && (
                            <span className="text-[10px] text-muted-foreground">{c.client_email}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClient && !clientOk && (
                  <p className="text-[11px] text-amber-500">
                    Esse cliente está sem {!selectedClient.client_document ? "CPF/CNPJ" : "email"}.
                    {" "}
                    <Link to={`/clients/${selectedClient.id}`} className="underline" onClick={() => handleClose(false)}>
                      Completar cadastro
                    </Link>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
