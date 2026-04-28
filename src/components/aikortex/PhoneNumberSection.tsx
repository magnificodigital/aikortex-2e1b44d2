import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Phone, AlertTriangle, Loader2, ExternalLink,
  ShoppingCart, Check, Info,
} from "lucide-react";
import { useTelnyxPhoneNumbers } from "@/hooks/use-telnyx-phone-numbers";
import BuyNumberModal from "./BuyNumberModal";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const COUNTRY_FLAGS: Record<string, string> = {
  "1": "🇺🇸", "55": "🇧🇷", "44": "🇬🇧", "351": "🇵🇹",
  "49": "🇩🇪", "33": "🇫🇷", "34": "🇪🇸", "52": "🇲🇽",
};

const COUNTRY_NAMES: Record<string, string> = {
  "1": "EUA", "55": "Brasil", "44": "Reino Unido", "351": "Portugal",
  "49": "Alemanha", "33": "França", "34": "Espanha", "52": "México",
};

function getCountryCode(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("55")) return "55";
  if (cleaned.startsWith("351")) return "351";
  if (cleaned.startsWith("44")) return "44";
  if (cleaned.startsWith("49")) return "49";
  if (cleaned.startsWith("33")) return "33";
  if (cleaned.startsWith("34")) return "34";
  if (cleaned.startsWith("52")) return "52";
  if (cleaned.startsWith("1")) return "1";
  return "";
}

function formatPhone(phone: string): string {
  const cc = getCountryCode(phone);
  const flag = COUNTRY_FLAGS[cc] || "📞";
  const name = COUNTRY_NAMES[cc] || "";
  return `${flag} ${phone}${name ? ` · ${name}` : ""}`;
}

interface Props {
  selectedNumber: string;
  onSelect: (phoneNumber: string) => void;
}

export default function PhoneNumberSection({ selectedNumber, onSelect }: Props) {
  const navigate = useNavigate();
  const {
    numbers, loading, noKeyConfigured,
    searchAvailable, buyNumber, configureWebhook, refetch,
  } = useTelnyxPhoneNumbers();

  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);

  const handleSelect = async (phoneNumber: string) => {
    onSelect(phoneNumber);
    setWebhookConfigured(false);

    // Auto-configure webhook
    const num = numbers.find(n => n.phone_number === phoneNumber);
    if (num) {
      const ok = await configureWebhook(num.id);
      if (ok) {
        setWebhookConfigured(true);
        toast.success("Webhook configurado automaticamente");
      }
    }
  };

  const handleBuySuccess = async () => {
    await refetch();
    // The newly bought number will be in the list after refetch
  };

  const selectedNum = numbers.find(n => n.phone_number === selectedNumber);

  if (loading) {
    return (
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Número de Telefone</h3>
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando números...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Número de Telefone</h3>

      {noKeyConfigured ? (
        <>
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Conecte sua conta Telnyx em <strong>Integrações</strong> para ativar ligações por telefone.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => navigate("/integrations")}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ir para Integrações
          </Button>
        </>
      ) : numbers.length === 0 ? (
        <>
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Nenhum número encontrado na sua conta Telnyx.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBuyModalOpen(true)}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Comprar número
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Selecionar número</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedNumber || ""} onValueChange={handleSelect}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Escolha um número" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map(n => (
                    <SelectItem key={n.id} value={n.phone_number}>
                      {formatPhone(n.phone_number)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedNum && (
                <Badge
                  variant={selectedNum.status === "active" ? "default" : "destructive"}
                  className="text-[9px] shrink-0"
                >
                  {selectedNum.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              )}
            </div>
          </div>

          {webhookConfigured && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Check className="w-3.5 h-3.5" />
              <span>Webhook configurado automaticamente</span>
            </div>
          )}

          <button
            onClick={() => setBuyModalOpen(true)}
            className="text-[10px] text-primary hover:underline cursor-pointer"
          >
            Comprar novo número
          </button>
        </>
      )}

      <BuyNumberModal
        open={buyModalOpen}
        onOpenChange={setBuyModalOpen}
        onSearch={searchAvailable}
        onBuy={buyNumber}
        onSuccess={handleBuySuccess}
      />
    </section>
  );
}
