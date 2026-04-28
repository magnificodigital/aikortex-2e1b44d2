import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Send, Printer } from "lucide-react";
import { Invoice, paymentStatusConfig } from "@/types/financial";
import { toast } from "@/hooks/use-toast";

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceDetailDialog = ({ invoice, open, onOpenChange }: InvoiceDetailDialogProps) => {
  if (!invoice) return null;
  const cfg = paymentStatusConfig[invoice.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{invoice.id}</span>
            <Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-medium text-foreground">{invoice.client}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor Total</p>
              <p className="font-bold text-foreground text-lg">R$ {invoice.amount.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Emissão</p>
              <p className="text-foreground">{new Date(invoice.issueDate).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vencimento</p>
              <p className="text-foreground">{new Date(invoice.dueDate).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">ITENS</h4>
            <div className="space-y-2">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity}x R$ {item.unitPrice.toLocaleString("pt-BR")}</p>
                  </div>
                  <span className="font-medium text-foreground">R$ {item.total.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-foreground">R$ {invoice.amount.toLocaleString("pt-BR")}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast({ title: "PDF gerado" })}>
              <Download className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast({ title: "Fatura enviada" })}>
              <Send className="w-3.5 h-3.5 mr-1" /> Enviar
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast({ title: "Imprimindo..." })}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailDialog;
