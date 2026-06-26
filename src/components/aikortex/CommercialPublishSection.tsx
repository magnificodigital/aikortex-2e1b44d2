import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublishForClientDialog from "./PublishForClientDialog";

interface Props {
  agentId: string;
  agentName: string;
}

interface AgentPublishState {
  published_at: string | null;
  client_subscription_id: string | null;
  client_info: { name?: string; email?: string; cpf_cnpj?: string } | null;
  subscription_status: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando 1º pagamento", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  active: { label: "Em dia", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  overdue: { label: "Atrasado", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  suspended: { label: "Suspenso", color: "bg-destructive/10 text-destructive border-destructive/30" },
  canceled: { label: "Cancelado", color: "bg-muted text-muted-foreground border-border" },
};

export default function CommercialPublishSection({ agentId, agentName }: Props) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AgentPublishState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadState() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_agents")
        .select("published_at, client_subscription_id, client_info, subscription_status")
        .eq("id", agentId)
        .maybeSingle();
      setState(data as AgentPublishState | null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!agentId || agentId === "new" || agentId.startsWith("new-")) {
      setLoading(false);
      return;
    }
    void loadState();
  }, [agentId]);

  const isNewAgent = !agentId || agentId === "new" || agentId.startsWith("new-");

  if (isNewAgent) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> Publicação & Cobrança
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Salve o agente primeiro pra poder publicar e ativar cobrança.
          </p>
        </div>
      </div>
    );
  }

  const published = !!state?.published_at && !!state?.client_subscription_id;
  const statusInfo = state?.subscription_status ? STATUS_LABEL[state.subscription_status] : null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" /> Publicação & Cobrança
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Master v7.4 §3 — agente fica grátis em rascunho. Publicar inicia cobrança recorrente do cliente final via Asaas, com split automático da tua margem.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : published ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Publicado
              </CardTitle>
              {statusInfo && (
                <Badge variant="outline" className={`text-[11px] ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Asaas Subscription <code className="text-foreground">{state?.client_subscription_id}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Cliente final</p>
              <p className="text-sm font-medium text-foreground">{state?.client_info?.name || "—"}</p>
              {state?.client_info?.email && (
                <p className="text-xs text-muted-foreground">{state.client_info.email}</p>
              )}
              {state?.client_info?.cpf_cnpj && (
                <p className="text-xs text-muted-foreground font-mono">{state.client_info.cpf_cnpj}</p>
              )}
            </div>

            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Publicado em</p>
              <p className="text-xs text-foreground">
                {state?.published_at && new Date(state.published_at).toLocaleString("pt-BR")}
              </p>
            </div>

            <a
              href={`https://www.asaas.com/subscriptions/show/${state?.client_subscription_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Abrir no Asaas <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pronto pra ir ao ar?</CardTitle>
            <CardDescription className="text-xs">
              Publicar cria uma assinatura Asaas mensal recorrente pro cliente final. Você define quem é o cliente final agora.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Trial de 7 dias antes da primeira cobrança</li>
              <li>• Cliente paga por Pix, boleto ou cartão (escolha no checkout)</li>
              <li>• Split automático pra tua wallet (configurada em Configurações → Financeiro)</li>
              <li>• Inadimplência suspende o agente automaticamente após período de tolerância</li>
            </ul>

            <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full">
              <Rocket className="w-4 h-4" /> Publicar e ativar cobrança
            </Button>
          </CardContent>
        </Card>
      )}

      <PublishForClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agentId={agentId}
        agentName={agentName}
        onPublished={loadState}
      />
    </div>
  );
}
