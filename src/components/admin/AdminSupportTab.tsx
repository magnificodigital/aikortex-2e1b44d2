import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, MessageSquare, Clock, CheckCircle2, AlertCircle, XCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
}

const ticketStatusLabel: Record<string, { text: string; className: string; icon: typeof Clock }> = {
  open: { text: "Aberto", className: "bg-amber-500/10 text-amber-600", icon: AlertCircle },
  in_progress: { text: "Em análise", className: "bg-blue-500/10 text-blue-600", icon: Clock },
  resolved: { text: "Resolvido", className: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  closed: { text: "Fechado", className: "bg-muted text-muted-foreground", icon: XCircle },
};

const AdminSupportTab = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [replyingTicket, setReplyingTicket] = useState<SupportTicket | null>(null);
  const [viewingTicket, setViewingTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("in_progress");
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (data) setTickets(data as SupportTicket[]);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleReplyTicket = async () => {
    if (!replyingTicket || !replyText.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("support_tickets").update({
      admin_reply: replyText,
      admin_replied_at: new Date().toISOString(),
      status: replyStatus,
    }).eq("id", replyingTicket.id);
    setSaving(false);
    if (error) { toast.error("Erro ao responder"); return; }
    toast.success("Resposta enviada");
    setReplyDialogOpen(false);
    setReplyingTicket(null);
    setReplyText("");
    fetchTickets();
  };

  const updateTicketStatus = async (id: string, status: string) => {
    await supabase.from("support_tickets").update({ status }).eq("id", id);
    fetchTickets();
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  const filtered = filterStatus === "all" ? tickets : tickets.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:ring-2 ring-amber-500/30 transition-all" onClick={() => setFilterStatus(filterStatus === "open" ? "all" : "open")}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{openCount}</p>
            <p className="text-[10px] text-muted-foreground">Abertos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-blue-500/30 transition-all" onClick={() => setFilterStatus(filterStatus === "in_progress" ? "all" : "in_progress")}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            <p className="text-[10px] text-muted-foreground">Em análise</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-emerald-500/30 transition-all" onClick={() => setFilterStatus(filterStatus === "resolved" ? "all" : "resolved")}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{resolvedCount}</p>
            <p className="text-[10px] text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-muted transition-all" onClick={() => setFilterStatus(filterStatus === "closed" ? "all" : "closed")}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{closedCount}</p>
            <p className="text-[10px] text-muted-foreground">Fechados</p>
          </CardContent>
        </Card>
      </div>

      {filterStatus !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Filtrando: {ticketStatusLabel[filterStatus]?.text}</Badge>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFilterStatus("all")}>Limpar filtro</Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assunto</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum chamado encontrado.</TableCell></TableRow>
              ) : filtered.map((t) => {
                const st = ticketStatusLabel[t.status] || ticketStatusLabel.open;
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{t.subject}</p>
                      {t.admin_reply && <p className="text-[10px] text-primary mt-0.5">✓ Respondido</p>}
                    </TableCell>
                    <TableCell><p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.message}</p></TableCell>
                    <TableCell>
                      <Select value={t.status} onValueChange={(v) => updateTicketStatus(t.id, v)}>
                        <SelectTrigger className="h-7 w-[110px]">
                          <Badge className={cn("text-[9px]", st.className)}>{st.text}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em análise</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed">Fechado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewingTicket(t); setDetailDialogOpen(true); }}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                          setReplyingTicket(t);
                          setReplyText(t.admin_reply || "");
                          setReplyStatus(t.status);
                          setReplyDialogOpen(true);
                        }}>
                          <Send className="w-3 h-3" /> Responder
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={(o) => { setDetailDialogOpen(o); if (!o) setViewingTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Chamado</DialogTitle></DialogHeader>
          {viewingTicket && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{viewingTicket.subject}</p>
                  <Badge className={cn("text-[9px]", (ticketStatusLabel[viewingTicket.status] || ticketStatusLabel.open).className)}>
                    {(ticketStatusLabel[viewingTicket.status] || ticketStatusLabel.open).text}
                  </Badge>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{viewingTicket.message}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Enviado em {new Date(viewingTicket.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}Prioridade: {viewingTicket.priority}
                </p>
              </div>
              {viewingTicket.admin_reply && (
                <div className="rounded-lg border-l-2 border-primary bg-primary/5 p-3 space-y-1">
                  <p className="text-[10px] font-medium text-primary">Resposta do suporte</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{viewingTicket.admin_reply}</p>
                  {viewingTicket.admin_replied_at && (
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(viewingTicket.admin_replied_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetailDialogOpen(false)}>Fechar</Button>
                <Button size="sm" className="gap-1.5" onClick={() => {
                  setDetailDialogOpen(false);
                  setReplyingTicket(viewingTicket);
                  setReplyText(viewingTicket.admin_reply || "");
                  setReplyStatus(viewingTicket.status);
                  setReplyDialogOpen(true);
                }}>
                  <Send className="w-3.5 h-3.5" /> Responder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={(o) => { setReplyDialogOpen(o); if (!o) setReplyingTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Responder Chamado</DialogTitle></DialogHeader>
          {replyingTicket && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">{replyingTicket.subject}</p>
                <p className="text-xs text-muted-foreground">{replyingTicket.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(replyingTicket.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={replyStatus} onValueChange={setReplyStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">Em análise</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Resposta</Label>
                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="min-h-[120px] text-xs" placeholder="Escreva sua resposta..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReplyDialogOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleReplyTicket} disabled={saving} className="gap-1.5">
                  <Send className="w-3.5 h-3.5" /> {saving ? "Enviando..." : "Enviar Resposta"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportTab;
