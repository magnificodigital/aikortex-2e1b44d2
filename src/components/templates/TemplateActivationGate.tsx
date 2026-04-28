import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

interface Props {
  clientId: string;
  templateId: string;
  agencyPrice?: number;
  templateName?: string;
  onAllowed: () => void;
  children: React.ReactNode;
}

type SubStatus = "pending" | "trial" | "active" | "cancelled" | "suspended";

const TemplateActivationGate = ({ clientId, templateId, agencyPrice, templateName, onAllowed, children }: Props) => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  const checkSubscription = async () => {
    setChecking(true);
    const { data } = await supabase
      .from("client_template_subscriptions")
      .select("*")
      .eq("client_id", clientId)
      .eq("template_id", templateId)
      .in("status", ["trial", "active"])
      .maybeSingle();

    if (!data) {
      setShowSubscribeModal(true);
      setChecking(false);
      return;
    }

    setSubStatus(data.status as SubStatus);

    if (data.status === "trial" && data.trial_ends_at) {
      const days = Math.max(0, Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86400000));
      setTrialDays(days);
    }

    if (data.status === "suspended" || data.status === "cancelled") {
      setBlocked(true);
      setBlockMessage("Assinatura suspensa. Regularize o pagamento para continuar.");
      setChecking(false);
      return;
    }

    // Activate
    if (!data.is_activated) {
      await supabase
        .from("client_template_subscriptions")
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq("id", data.id);
    }

    onAllowed();
    setChecking(false);
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await supabase.functions.invoke("asaas-subscribe-template", {
        body: { client_id: clientId, template_id: templateId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success(res.data.message || "Template assinado com sucesso!");
      setShowSubscribeModal(false);
      onAllowed();
    } catch (err: any) {
      toast.error(err.message || "Erro ao assinar template");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      <div onClick={checkSubscription} className="cursor-pointer">
        {children}
      </div>

      {subStatus === "trial" && trialDays > 0 && (
        <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          Período de teste — {trialDays} dias restantes
        </div>
      )}

      {blocked && (
        <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <ShieldAlert className="w-3 h-3" />
          {blockMessage}
        </div>
      )}

      <Dialog open={showSubscribeModal} onOpenChange={setShowSubscribeModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assine o template para ativar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para ativar <strong>{templateName || "este template"}</strong>, é necessário assiná-lo.
            </p>
            {agencyPrice && (
              <div className="text-center">
                <span className="text-2xl font-bold text-foreground">R$ {agencyPrice.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            )}
            <Button className="w-full" onClick={handleSubscribe} disabled={subscribing}>
              {subscribing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Assinar R$ {agencyPrice?.toFixed(2) ?? "?"}/mês
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateActivationGate;
