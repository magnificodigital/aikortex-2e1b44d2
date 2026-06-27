import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Preco default Master v7.4: R$ 997/mes. Templates podem override via
// agent_templates.retail_price_cents.
const DEFAULT_PRICE_CENTS = 99700;

export default function CommercialPublishSection({ agentId, agentName }: Props) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AgentPublishState | null>(null);
  const [priceCents, setPriceCents] = useState<number>(DEFAULT_PRICE_CENTS);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadState() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_agents")
        .select("published_at, client_subscription_id, client_info, subscription_status, template_id")
        .eq("id", agentId)
        .maybeSingle();
      setState(data as AgentPublishState | null);
      const tplId = (data as any)?.template_id;
      if (tplId) {
        const { data: tpl } = await supabase
          .from("agent_templates")
          .select("retail_price_cents")
          .eq("id", tplId)
          .maybeSingle();
        if ((tpl as any)?.retail_price_cents) setPriceCents((tpl as any).retail_price_cents);
      }
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
      <div className="max-w-md">
        <p className="text-sm text-muted-foreground">Salve o agente primeiro pra poder publicar.</p>
      </div>
    );
  }

  const published = !!state?.published_at && !!state?.client_subscription_id;
  const statusInfo = state?.subscription_status ? STATUS_LABEL[state.subscription_status] : null;
  const priceFmt = (priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 max-w-md">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (published) {
    return (
      <div className="max-w-md">
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
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Cliente final</p>
              <p className="text-sm font-medium text-foreground">{state?.client_info?.name || "—"}</p>
              {state?.client_info?.email && (
                <p className="text-xs text-muted-foreground">{state.client_info.email}</p>
              )}
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

  return (
    <div className="max-w-md">
      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground tracking-wider">Mensalidade</p>
            <p className="text-3xl font-bold text-foreground">
              {priceFmt}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full gap-2 h-11">
            <Rocket className="w-4 h-4" /> Publicar
          </Button>
        </CardContent>
      </Card>
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
