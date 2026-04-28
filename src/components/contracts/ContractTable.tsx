import { Eye, Pencil, PenLine, Send, Copy } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Contract, contractStatusConfig, contractTypeConfig, frequencyLabels } from "@/types/contract";
import { toast } from "@/hooks/use-toast";

interface ContractTableProps {
  contracts: Contract[];
  onView: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onSign?: (contract: Contract) => void;
}

const ContractTable = ({ contracts, onView, onEdit, onSign }: ContractTableProps) => (
  <div className="glass-card rounded-xl overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="border-border/50">
          <TableHead className="text-xs">Contrato</TableHead>
          <TableHead className="text-xs">Cliente</TableHead>
          <TableHead className="text-xs">Tipo</TableHead>
          <TableHead className="text-xs">Valor</TableHead>
          <TableHead className="text-xs">Frequência</TableHead>
          <TableHead className="text-xs">Vigência</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="text-xs text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map(c => {
          const sCfg = contractStatusConfig[c.status];
          const tCfg = contractTypeConfig[c.type];
          return (
            <TableRow key={c.id} className="border-border/30 hover:bg-muted/30 cursor-pointer" onClick={() => onView(c)}>
              <TableCell>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{c.id}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-foreground">{c.client}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{tCfg.label}</Badge></TableCell>
              <TableCell className="text-sm font-semibold text-foreground">R$ {c.value.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{frequencyLabels[c.frequency]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(c.startDate).toLocaleDateString("pt-BR")} — {new Date(c.endDate).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell><Badge variant="secondary" className={`text-[10px] ${sCfg.color}`}>{sCfg.label}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onView(c); }}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(c); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {(c.status === "draft" || c.status === "pending_signature") && onSign && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={e => { e.stopPropagation(); onSign(c); }} title="Assinar">
                      <PenLine className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default ContractTable;
