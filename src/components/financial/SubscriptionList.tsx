import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { mockSubscriptions, frequencyLabels } from "@/types/financial";

const statusConfig = {
  active: { label: "Ativo", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  paused: { label: "Pausado", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

const SubscriptionList = () => (
  <div className="glass-card rounded-xl overflow-hidden">
    <div className="p-4 border-b border-border/50">
      <h3 className="text-sm font-semibold text-foreground">Assinaturas Recorrentes</h3>
      <p className="text-[11px] text-muted-foreground">{mockSubscriptions.filter(s => s.status === "active").length} assinaturas ativas</p>
    </div>
    <Table>
      <TableHeader>
        <TableRow className="border-border/50">
          <TableHead className="text-xs">Cliente</TableHead>
          <TableHead className="text-xs">Plano</TableHead>
          <TableHead className="text-xs">Valor</TableHead>
          <TableHead className="text-xs">Frequência</TableHead>
          <TableHead className="text-xs">Próx. Cobrança</TableHead>
          <TableHead className="text-xs">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockSubscriptions.map(sub => {
          const cfg = statusConfig[sub.status];
          return (
            <TableRow key={sub.id} className="border-border/30">
              <TableCell className="text-sm font-medium text-foreground">{sub.client}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{sub.plan}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">R$ {sub.amount.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{frequencyLabels[sub.frequency]}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{sub.nextBillingDate === "-" ? "-" : new Date(sub.nextBillingDate).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default SubscriptionList;
