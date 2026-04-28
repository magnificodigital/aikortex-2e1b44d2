import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Video, FileText, HelpCircle, MessageSquare, Send, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  icon_name: string;
  read_time: string;
  sort_order: number;
  is_active: boolean;
  video_url: string;
  article_type: string;
  collection: string;
  created_at: string;
  updated_at: string;
}

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

const iconOptions = [
  "Bot", "Workflow", "MessageSquare", "Send", "Users", "ShoppingCart",
  "DollarSign", "CheckSquare", "FileText", "Video", "AppWindow",
  "LayoutTemplate", "Settings", "BookOpen", "HelpCircle", "Shield",
  "Zap", "Globe", "Mail", "Phone", "Play", "LifeBuoy",
];
const categoryOptions = ["Aikortex", "Gestão", "Sistema", "Geral"];
const typeOptions = [
  { value: "article", label: "Artigo" },
  { value: "video", label: "Vídeo" },
  { value: "faq", label: "FAQ" },
];

const emptyArticle = {
  title: "", description: "", content: "", category: "Geral",
  icon_name: "BookOpen", read_time: "5 min", sort_order: 0, is_active: true,
  video_url: "", article_type: "article", collection: "Geral",
};

const AdminHelpTab = () => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<HelpArticle> | null>(null);
  const [replyingTicket, setReplyingTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("in_progress");
  const [saving, setSaving] = useState(false);
  const [innerTab, setInnerTab] = useState("articles");

  const fetchArticles = async () => {
    const { data } = await supabase.from("help_articles").select("*").order("sort_order", { ascending: true });
    if (data) setArticles(data as HelpArticle[]);
    setLoading(false);
  };

  const fetchTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (data) setTickets(data as SupportTicket[]);
  };

  useEffect(() => { fetchArticles(); fetchTickets(); }, []);

  const handleSave = async () => {
    if (!editingArticle?.title?.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        title: editingArticle.title!,
        description: editingArticle.description || "",
        content: editingArticle.content || "",
        category: editingArticle.category || "Geral",
        icon_name: editingArticle.icon_name || "BookOpen",
        read_time: editingArticle.read_time || "5 min",
        sort_order: editingArticle.sort_order || 0,
        is_active: editingArticle.is_active ?? true,
        video_url: editingArticle.video_url || "",
        article_type: editingArticle.article_type || "article",
        collection: editingArticle.collection || "Geral",
      };
      if (editingArticle.id) {
        const { error } = await supabase.from("help_articles").update(payload).eq("id", editingArticle.id);
        if (error) throw error;
        toast.success("Artigo atualizado");
      } else {
        const { error } = await supabase.from("help_articles").insert(payload);
        if (error) throw error;
        toast.success("Artigo criado");
      }
      setDialogOpen(false);
      setEditingArticle(null);
      fetchArticles();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este artigo?")) return;
    const { error } = await supabase.from("help_articles").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Artigo excluído"); fetchArticles(); }
  };

  const toggleActive = async (article: HelpArticle) => {
    await supabase.from("help_articles").update({ is_active: !article.is_active }).eq("id", article.id);
    fetchArticles();
  };

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

  const ticketStatusLabel: Record<string, { text: string; className: string }> = {
    open: { text: "Aberto", className: "bg-amber-500/10 text-amber-600" },
    in_progress: { text: "Em análise", className: "bg-blue-500/10 text-blue-600" },
    resolved: { text: "Resolvido", className: "bg-emerald-500/10 text-emerald-600" },
    closed: { text: "Fechado", className: "bg-muted text-muted-foreground" },
  };

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  return (
    <div className="space-y-4">
      <Tabs value={innerTab} onValueChange={setInnerTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="articles" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Artigos & Vídeos
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs gap-1.5 relative">
              <MessageSquare className="w-3.5 h-3.5" /> Chamados
              {openTickets > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                  {openTickets}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          {innerTab === "articles" && (
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingArticle({ ...emptyArticle, sort_order: articles.length + 1 }); setDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Novo Artigo
            </Button>
          )}
        </div>

        {/* ── ARTICLES TAB ── */}
        <TabsContent value="articles" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{articles.length}</p>
              <p className="text-[10px] text-muted-foreground">Total de artigos</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{articles.filter((a) => a.article_type === "video").length}</p>
              <p className="text-[10px] text-muted-foreground">Vídeos</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{articles.filter((a) => a.is_active).length}</p>
              <p className="text-[10px] text-muted-foreground">Ativos</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Coleção</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                  ) : articles.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum artigo cadastrado.</TableCell></TableRow>
                  ) : articles.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">{a.sort_order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {a.article_type === "video" && <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{a.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {a.article_type === "video" ? "Vídeo" : a.article_type === "faq" ? "FAQ" : "Artigo"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{a.category}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.collection}</TableCell>
                      <TableCell>
                        <button onClick={() => toggleActive(a)} title={a.is_active ? "Desativar" : "Ativar"}>
                          {a.is_active ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingArticle(a); setDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TICKETS TAB ── */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {(["open", "in_progress", "resolved", "closed"] as const).map((s) => {
              const st = ticketStatusLabel[s];
              const count = tickets.filter((t) => t.status === s).length;
              return (
                <Card key={s}><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{st.text}</p>
                </CardContent></Card>
              );
            })}
          </div>

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
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum chamado recebido.</TableCell></TableRow>
                  ) : tickets.map((t) => {
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
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            setReplyingTicket(t);
                            setReplyText(t.admin_reply || "");
                            setReplyStatus(t.status);
                            setReplyDialogOpen(true);
                          }}>
                            <Send className="w-3 h-3" /> Responder
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── ARTICLE DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingArticle(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle?.id ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
          </DialogHeader>
          {editingArticle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input value={editingArticle.title || ""} onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={editingArticle.article_type || "article"} onValueChange={(v) => setEditingArticle({ ...editingArticle, article_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição curta</Label>
                <Input value={editingArticle.description || ""} onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })} />
              </div>

              {/* Video URL - show for video type */}
              {(editingArticle.article_type === "video" || editingArticle.video_url) && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-red-500" /> URL do Vídeo
                  </Label>
                  <Input
                    value={editingArticle.video_url || ""}
                    onChange={(e) => setEditingArticle({ ...editingArticle, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/... ou https://loom.com/share/..."
                  />
                  <p className="text-[10px] text-muted-foreground">Suporta YouTube, Vimeo e Loom</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={editingArticle.category || "Geral"} onValueChange={(v) => setEditingArticle({ ...editingArticle, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Coleção</Label>
                  <Input value={editingArticle.collection || ""} onChange={(e) => setEditingArticle({ ...editingArticle, collection: e.target.value })} placeholder="Ex: Primeiros Passos" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ícone</Label>
                  <Select value={editingArticle.icon_name || "BookOpen"} onValueChange={(v) => setEditingArticle({ ...editingArticle, icon_name: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tempo de leitura</Label>
                  <Input value={editingArticle.read_time || ""} onChange={(e) => setEditingArticle({ ...editingArticle, read_time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ordem</Label>
                  <Input type="number" value={editingArticle.sort_order || 0} onChange={(e) => setEditingArticle({ ...editingArticle, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Conteúdo (Markdown)</Label>
                <Textarea
                  value={editingArticle.content || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="min-h-[200px] font-mono text-xs"
                  placeholder="# Título&#10;&#10;## Seção&#10;- Item 1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingArticle.is_active ?? true} onCheckedChange={(c) => setEditingArticle({ ...editingArticle, is_active: c })} />
                <Label className="text-xs">Artigo ativo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingArticle(null); }}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── REPLY DIALOG ── */}
      <Dialog open={replyDialogOpen} onOpenChange={(o) => { setReplyDialogOpen(o); if (!o) setReplyingTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder Chamado</DialogTitle>
          </DialogHeader>
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

export default AdminHelpTab;
