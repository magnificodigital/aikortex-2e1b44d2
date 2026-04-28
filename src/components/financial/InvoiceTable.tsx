import { Eye, Send, Download, MoreHorizontal } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Invoice, paymentStatusConfig } from "@/types/financial";
import { toast } from "@/hooks/use-toast";

interface InvoiceTableProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
}

const InvoiceTable = ({ invoices, onView }: InvoiceTableProps) => (
  <div className="glass-card rounded-xl overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="border-border/50">
          <TableHead className="text-xs">Fatura</TableHead>
          <TableHead className="text-xs">Cliente</TableHead>
          <TableHead className="text-xs">Descrição</TableHead>
          <TableHead className="text-xs">Valor</TableHead>
          <TableHead className="text-xs">Vencimento</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="text-xs text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map(inv => {
          const cfg = paymentStatusConfig[inv.status];
          return (
            <TableRow key={inv.id} className="border-border/30 hover:bg-muted/30 cursor-pointer" onClick={() => onView(inv)}>
              <TableCell className="font-mono text-xs font-medium text-foreground">{inv.id}</TableCell>
              <TableCell className="text-sm text-foreground">{inv.client}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inv.description}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">R$ {inv.amount.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(inv); }}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toast({ title: "PDF gerado", description: `Fatura ${inv.id} baixada.` }); }}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toast({ title: "Enviada", description: `Fatura ${inv.id} enviada para ${inv.client}.` }); }}>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default InvoiceTable;
