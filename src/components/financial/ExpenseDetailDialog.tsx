import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { Expense, costCenterLabels, frequencyLabels } from "@/types/financial";

interface ExpenseDetailDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const ExpenseDetailDialog = ({ expense, open, onOpenChange, onEdit }: ExpenseDetailDialogProps) => {
  if (!expense) return null;

  const details = [
    { label: "Descrição", value: expense.description },
    { label: "Valor", value: `R$ ${expense.amount.toLocaleString("pt-BR")}` },
    { label: "Data", value: new Date(expense.date).toLocaleDateString("pt-BR") },
    { label: "Centro de Custo", value: costCenterLabels[expense.costCenter] },
    { label: "Categoria", value: expense.category || "—" },
    { label: "Fornecedor", value: expense.vendor || "—" },
    { label: "Forma de Pagamento", value: expense.paymentMethod || "—" },
    { label: "Tipo", value: expense.recurring ? "Recorrente" : "Avulsa" },
    ...(expense.recurring && expense.frequency ? [{ label: "Frequência", value: frequencyLabels[expense.frequency] }] : []),
    ...(expense.notes ? [{ label: "Observações", value: expense.notes }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Despesa
            <Badge variant="secondary" className="text-[10px]">{expense.id}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {details.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start border-b border-border/30 pb-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDetailDialog;
