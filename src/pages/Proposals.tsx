import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import ClientsAreaTabs from "@/components/clients/ClientsAreaTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSignature, Plus, Search, MoreHorizontal, Eye, Send, FileCheck, Trash2,
  CheckCircle2, Clock, XCircle, FilePlus,
} from "lucide-react";
import { toast } from "sonner";

type ProposalStatus = "draft" | "sent" | "viewed" | "approved" | "rejected" | "expired";

type Proposal = {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: ProposalStatus;
  sentAt: string | null;
  expiresAt: string | null;
};

const STATUS_MAP: Record<ProposalStatus, { label: string; class: string; icon: any }> = {
  draft:    { label: "Rascunho",       class: "bg-muted text-muted-foreground border-border", icon: FilePlus },
  sent:     { label: "Enviada",        class: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Send },
  viewed:   { label: "Visualizada",    class: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Eye },
  approved: { label: "Aprovada",       class: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitada",      class: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  expired:  { label: "Expirada",       class: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
};

const Proposals = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [proposals] = useState<Proposal[]>([]);

  const filtered = proposals.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: proposals.length,
    sent: proposals.filter((p) => p.status === "sent" || p.status === "viewed").length,
    approved: proposals.filter((p) => p.status === "approved").length,
    pipeline: proposals
      .filter((p) => p.status === "sent" || p.status === "viewed")
      .reduce((s, p) => s + p.amount, 0),
  };

  const handleConvertToContract = (p: Proposal) => {
    toast.success(`Proposta "${p.title}" convertida em contrato`);
  };

  return (
    <ModuleGate moduleKey="gestao.contratos">
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-7xl space-y-6">
          <ClientsAreaTabs />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
                <p className="text-sm text-muted-foreground">
                  Crie e envie propostas comerciais. Após a aprovação, converta em contrato.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => toast.info("Em breve: editor de propostas")}>
              <Plus className="w-4 h-4 mr-1" /> Nova Proposta
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Aguardando resposta</p>
              <p className="text-xl font-bold text-foreground">{stats.sent}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Aprovadas</p>
              <p className="text-xl font-bold text-foreground">{stats.approved}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pipeline (R$)</p>
              <p className="text-xl font-bold text-foreground">R$ {stats.pipeline.toFixed(0)}</p>
            </CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="viewed">Visualizada</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Enviada em</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhuma proposta ainda. Clique em "Nova Proposta" para começar.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => {
                  const st = STATUS_MAP[p.status];
                  const Icon = st.icon;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-foreground">{p.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.client}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm font-medium text-foreground">
                        R$ {p.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${st.class} border gap-1`}>
                          <Icon className="w-3 h-3" />
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {p.sentAt ? new Date(p.sentAt).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" /> Visualizar
                            </DropdownMenuItem>
                            {p.status === "draft" && (
                              <DropdownMenuItem>
                                <Send className="w-4 h-4 mr-2" /> Enviar para cliente
                              </DropdownMenuItem>
                            )}
                            {p.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleConvertToContract(p)}>
                                <FileCheck className="w-4 h-4 mr-2" /> Converter em contrato
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGate>
  );
};

export default Proposals;
