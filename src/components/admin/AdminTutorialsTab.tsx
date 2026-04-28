import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Video, FileText, Play, GripVertical } from "lucide-react";

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

const AdminTutorialsTab = () => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<HelpArticle> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchArticles = async () => {
    const { data } = await supabase.from("help_articles").select("*").order("sort_order", { ascending: true });
    if (data) setArticles(data as HelpArticle[]);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

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

  const filtered = articles.filter((a) => {
    if (filterType !== "all" && a.article_type !== filterType) return false;
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    return true;
  });

  const videoCount = articles.filter((a) => a.article_type === "video").length;
  const articleCount = articles.filter((a) => a.article_type === "article").length;
  const faqCount = articles.filter((a) => a.article_type === "faq").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{articles.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{articleCount}</p>
          <p className="text-[10px] text-muted-foreground">Artigos</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{videoCount}</p>
          <p className="text-[10px] text-muted-foreground">Vídeos</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{articles.filter((a) => a.is_active).length}</p>
          <p className="text-[10px] text-muted-foreground">Ativos</p>
        </CardContent></Card>
      </div>

      {/* Filters + Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="article">Artigos</SelectItem>
              <SelectItem value="video">Vídeos</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingArticle({ ...emptyArticle, sort_order: articles.length + 1 }); setDialogOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> Novo Conteúdo
        </Button>
      </div>

      {/* Table */}
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
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum conteúdo encontrado.</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground">{a.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {a.article_type === "video" && <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      {a.article_type === "faq" && <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
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

      {/* Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingArticle(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle?.id ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
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
              {(editingArticle.article_type === "video" || editingArticle.video_url) && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-red-500" /> URL do Vídeo
                  </Label>
                  <Input
                    value={editingArticle.video_url || ""}
                    onChange={(e) => setEditingArticle({ ...editingArticle, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
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
                <Label className="text-xs">Conteúdo ativo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); setEditingArticle(null); }}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTutorialsTab;
