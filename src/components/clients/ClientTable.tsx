import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, Pencil } from "lucide-react";
import { Client, CLIENT_STATUS_CONFIG } from "@/types/client";
import ClientHealthScore from "./ClientHealthScore";

interface ClientTableProps {
  clients: Client[];
  onSelect: (c: Client) => void;
  onEdit?: (c: Client) => void;
}

const ClientTable = ({ clients, onSelect, onEdit }: ClientTableProps) => (
  <div className="glass-card rounded-lg overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="border-border/50 hover:bg-transparent">
          <TableHead>Empresa</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Indústria</TableHead>
          <TableHead className="hidden md:table-cell">Gerente</TableHead>
          <TableHead className="hidden lg:table-cell">Health</TableHead>
          <TableHead className="hidden lg:table-cell">Receita</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map(client => {
          const status = CLIENT_STATUS_CONFIG[client.status];
          return (
            <TableRow key={client.id} className="border-border/30 cursor-pointer" onClick={() => onSelect(client)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {client.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{client.companyName}</p>
                    <p className="text-xs text-muted-foreground">{client.contactName}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{client.industry}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{client.accountManager}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <ClientHealthScore score={client.healthScore} />
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm font-medium text-foreground">{client.revenue}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onEdit?.(client); }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {clients.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
              Nenhum cliente encontrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

export default ClientTable;
