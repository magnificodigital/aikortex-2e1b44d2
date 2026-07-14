/**
 * SellStarkDialog — agencia vende o Stark pro cliente final.
 *
 * Preco base vem de platform_config.stark_resale (admin define em
 * /admin?tab=stark). A agencia escolhe o preco de venda (>= base);
 * a diferenca e' a margem dela. Edge stark-subscribe-client cria a
 * assinatura Asaas com split fixedValue=base e habilita o modulo
 * stark.copilot no workspace do cliente.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";

interface SellStarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  /** Callback pos-venda (recarregar dados do cliente). */
  onSold?: () => void;
}

export function SellStarkDialog({ open, onOpenChange, clientId, clientName, onSold }: SellStarkDialogProps) {
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await (supabase.from("platform_config" as any) as any)
          .select("value")
          .eq("key", "stark_resale")
          .maybeSingle();
        const parsed = data?.value ? JSON.parse(data.value) : {};
        const base = typeof parsed.base_price_monthly === "number" ? parsed.base_price_monthly : 97;
        setBasePrice(base);
        // Sugestao inicial: 2x o base (mesma heuristica dos templates)
        setPrice(String(base * 2));
      } catch {
        setBasePrice(97);
        setPrice("194");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const priceNum = useMemo(() => parseFloat(price.replace(",", ".")), [price]);
  const margin = useMemo(
    () => (Number.isFinite(priceNum) && basePrice !== null ? priceNum - basePrice : null),
    [priceNum, basePrice],
  );
  const invalid = !Number.isFinite(priceNum) || (basePrice !== null && priceNum < basePrice);

  async function handleSell() {
    if (invalid) return;
    setSelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Sessão expirada"); return; }
      const resp = await fetch(fnUrl("stark-subscribe-client"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: clientId, agency_price_monthly: priceNum }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(typeof j?.error === "string" ? j.error : "Falha ao vender o Stark");
        return;
      }
      toast.success(j?.message || "Stark vendido!");
      onOpenChange(false);
      onSold?.();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Vender Stark
          </DialogTitle>
          <DialogDescription>
            Copiloto de IA por voz no workspace de <span className="font-medium">{clientName}</span>.
            Assinatura mensal com 7 dias de teste.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Preço de venda (R$/mês)</Label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className={invalid ? "border-destructive" : ""}
              />
              {basePrice !== null && (
                <p className={`text-[11px] ${invalid ? "text-destructive" : "text-muted-foreground"}`}>
                  Mínimo R$ {basePrice.toFixed(2)} (base da plataforma).
                </p>
              )}
            </div>

            {margin !== null && !invalid && (
              <div className="rounded-lg border border-border p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente paga</span>
                  <span className="font-medium">R$ {priceNum.toFixed(2)}/mês</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plataforma (base)</span>
                  <span>R$ {basePrice!.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary font-medium">
                  <span>Sua margem</span>
                  <span>R$ {margin.toFixed(2)}/mês</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSell} disabled={loading || selling || invalid} className="gap-1.5">
            {selling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Vender Stark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
