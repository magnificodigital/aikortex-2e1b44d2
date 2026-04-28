import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LayoutTemplate, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface TemplateRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  min_tier: string;
  platform_price_monthly: number;
  features: string[] | null;
  demo_url: string | null;
  thumbnail_url: string | null;
  is_exclusive: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface TemplateForm {
  name: string;
  slug: string;
  description: string;
  category: string;
  min_tier: string;
  platform_price_monthly: number;
  features: string[];
  demo_url: string;
  thumbnail_url: string;
  is_exclusive: boolean;
  is_active: boolean;
}

const emptyForm: TemplateForm = {
  name: "",
  slug: "",
  description: "",
  category: "agent",
  min_tier: "starter",
  platform_price_monthly: 0,
  features: [],
  demo_url: "",
  thumbnail_url: "",
  is_exclusive: false,
  is_active: true,
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agente",
  automation: "Automação",
  app: "Aplicativo",
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-amber-700/10 text-amber-700" },
  explorer: { label: "Explorer", color: "bg-slate-400/10 text-slate-500" },
  hack: { label: "Hack", color: "bg-yellow-500/10 text-yellow-600" },
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const AdminTemplatesTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [newFeature, setNewFeature] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_templates")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: { id?: string } & TemplateForm) => {
      const { id, ...rest } = payload;
      const row = {
        ...rest,
        features: rest.features as any,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabase
          .from("platform_templates")
          .update(row as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_templates")
          .insert(row as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      toast.success(editingTemplate ? "Template atualizado" : "Template criado");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      toast.success("Template excluído");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Erro ao excluir template"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("platform_templates")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(emptyForm);
    setIsCreating(true);
  };

  const openEdit = (t: TemplateRow) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      slug: t.slug,
      description: t.description ?? "",
      category: t.category,
      min_tier: t.min_tier,
      platform_price_monthly: Number(t.platform_price_monthly),
      features: Array.isArray(t.features) ? t.features : [],
      demo_url: t.demo_url ?? "",
      thumbnail_url: t.thumbnail_url ?? "",
      is_exclusive: t.is_exclusive ?? false,
      is_active: t.is_active ?? true,
    });
    setIsCreating(true);
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setForm(emptyForm);
    setNewFeature("");
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    if (form.platform_price_monthly <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }
    upsertMutation.mutate({
      id: editingTemplate?.id,
      ...form,
    });
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    if (form.features.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, features: [...prev.features, trimmed] }));
    setNewFeature("");
  };

  const removeFeature = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const modalOpen = isCreating;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutTemplate className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Templates da Plataforma</h2>
            <p className="text-xs text-muted-foreground">
              Gerencie os templates disponíveis para as agências
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Novo Template
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tier mínimo</TableHead>
                <TableHead className="text-right">Preço/mês</TableHead>
                <TableHead>Exclusivo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum template cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => {
                  const tierCfg = TIER_LABELS[t.min_tier] ?? TIER_LABELS.starter;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border-0 ${tierCfg.color}`}>
                          {tierCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        R$ {Number(t.platform_price_monthly).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {t.is_exclusive && (
                          <Badge variant="secondary" className="text-[10px]">
                            Exclusivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={t.is_active ?? true}
                          onCheckedChange={(val) =>
                            toggleActiveMutation.mutate({ id: t.id, is_active: val })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Atualize as informações do template"
                : "Preencha os dados para criar um novo template"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: editingTemplate ? prev.slug : slugify(name),
                  }));
                }}
                placeholder="Ex: SDR Inteligente"
              />
            </div>

            <div className="space-y-1">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="sdr-inteligente"
              />
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
                placeholder="Breve descrição do template..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="automation">Automação</SelectItem>
                    <SelectItem value="app">Aplicativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Tier mínimo</Label>
                <Select
                  value={form.min_tier}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, min_tier: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="hack">Hack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Preço mensal da plataforma (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.platform_price_monthly}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    platform_price_monthly: Number(e.target.value),
                  }))
                }
              />
            </div>

            {/* Features list */}
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Adicionar feature..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {form.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {f}
                      <button onClick={() => removeFeature(i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>URL do demo</Label>
              <Input
                value={form.demo_url}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, demo_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1">
              <Label>Thumbnail URL</Label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Exclusivo do Hack</Label>
              <Switch
                checked={form.is_exclusive}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, is_exclusive: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((prev) => ({ ...prev, is_active: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Agências que já vendem este template continuarão com
              acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTemplatesTab;