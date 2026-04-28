import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShoppingCart, Check } from "lucide-react";
import type { AvailableNumber } from "@/hooks/use-telnyx-phone-numbers";

const COUNTRIES = [
  { code: "BR", label: "🇧🇷 Brasil" },
  { code: "US", label: "🇺🇸 Estados Unidos" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "GB", label: "🇬🇧 Reino Unido" },
  { code: "DE", label: "🇩🇪 Alemanha" },
  { code: "FR", label: "🇫🇷 França" },
  { code: "ES", label: "🇪🇸 Espanha" },
  { code: "MX", label: "🇲🇽 México" },
];

const NUMBER_TYPES = [
  { value: "local", label: "Local" },
  { value: "toll_free", label: "Toll-free" },
  { value: "mobile", label: "Móvel" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (country: string, type: string, areaCode?: string) => Promise<AvailableNumber[]>;
  onBuy: (phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

export default function BuyNumberModal({ open, onOpenChange, onSearch, onBuy, onSuccess }: Props) {
  const [country, setCountry] = useState("BR");
  const [numberType, setNumberType] = useState("local");
  const [areaCode, setAreaCode] = useState("");
  const [results, setResults] = useState<AvailableNumber[]>([]);
  const [searching, setSearching] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bought, setBought] = useState<string | null>(null);

  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    setBought(null);
    const nums = await onSearch(country, numberType, areaCode || undefined);
    setResults(nums);
    if (nums.length === 0) setError("Nenhum número disponível com esses filtros.");
    setSearching(false);
  };

  const handleBuy = async (phoneNumber: string) => {
    setBuyingNumber(phoneNumber);
    setError(null);
    const result = await onBuy(phoneNumber);
    if (result.success) {
      setBought(phoneNumber);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        // reset
        setResults([]);
        setBought(null);
      }, 1200);
    } else {
      setError(result.error || "Erro ao comprar número");
    }
    setBuyingNumber(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Comprar Número de Telefone</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">País</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={numberType} onValueChange={setNumberType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NUMBER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Código de área (opcional)</Label>
            <Input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="Ex: 11" className="h-8 text-xs" />
          </div>

          <Button onClick={handleSearch} disabled={searching} className="w-full h-8 text-xs gap-1.5">
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Buscar números disponíveis
          </Button>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((num) => {
                const isBought = bought === num.phone_number;
                return (
                  <div
                    key={num.phone_number}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      isBought ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <div>
                      <p className="font-mono font-medium text-foreground">{num.phone_number}</p>
                      {num.region_information?.[0] && (
                        <p className="text-[10px] text-muted-foreground">
                          {num.region_information[0].region_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {num.monthly_cost !== "—" && (
                        <Badge variant="secondary" className="text-[9px]">{num.monthly_cost}/mês</Badge>
                      )}
                      <Button
                        variant={isBought ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        disabled={buyingNumber !== null || isBought}
                        onClick={() => handleBuy(num.phone_number)}
                      >
                        {isBought ? (
                          <><Check className="w-3 h-3" /> Comprado</>
                        ) : buyingNumber === num.phone_number ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <><ShoppingCart className="w-3 h-3" /> Comprar</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
