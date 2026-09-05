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
import { LayoutTemplate, Plus, Pencil, Trash2, Loader2, X, Check, Wrench } from "lucide-react";
import { toast } from "sonner";
import { RUNTIME_TOOLS, INTEGRATION_TOOLS } from "@/lib/agent-runtime-tools";

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
  niche_id: string | null;
  agent_config: Record<string, any> | null;
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
  // ── comportamento do agente modelo (só quando category === "agent") ──
  niche_id: string;
  agent_type: string;
  tone_of_voice: string;
  objective: string;
  greeting: string;
  instructions: string;
  enabledTools: string[];
  integrations: string[];
}

const emptyForm: TemplateForm = {
  name: "",
  slug: "",
  description: "",
  category: "agent",
  min_tier: "start",
  platform_price_monthly: 0,
  features: [],
  demo_url: "",
  thumbnail_url: "",
  is_exclusive: false,
  is_active: true,
  niche_id: "",
  agent_type: "custom",
  tone_of_voice: "",
  objective: "",
  greeting: "",
  instructions: "",
  enabledTools: [],
  integrations: [],
};

const AGENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "sdr", label: "Qualificador de Leads (SDR)" },
  { value: "sac", label: "Suporte ao Cliente (SAC)" },
  { value: "marketing", label: "Gestor de Conteúdos" },
  { value: "custom", label: "Personalizado" },
];

const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agente",
  automation: "Automação",
  app: "Aplicativo",
};

// Alinhado ao Master v7.4 §3.2: Start (gratuito) → Hack (R$197) → Growth (R$397)
const TIER_LABELS: Record<string, { label: string; color: string }> = {
  start: { label: "Start", color: "bg-amber-700/10 text-amber-700" },
  hack: { label: "Hack", color: "bg-slate-400/10 text-slate-500" },
  growth: { label: "Growth", color: "bg-yellow-500/10 text-yellow-600" },
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

  const { data: niches = [] } = useQuery({
    queryKey: ["admin-template-niches-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("niche_categories")
        .select("id, name_pt")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name_pt: string }[];
    },
  });

  const toggleInList = (key: "enabledTools" | "integrations", id: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));

  const upsertMutation = useMutation({
    mutationFn: async (payload: { id?: string; row: Record<string, any> }) => {
      const { id, row } = payload;
      const dbRow = { ...row, updated_at: new Date().toISOString() };

      if (id) {
        const { error } = await supabase
          .from("platform_templates")
          .update(dbRow as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_templates")
          .insert(dbRow as any);
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
    const cfg = (t.agent_config ?? {}) as Record<string, any>;
    const inner = (cfg.config ?? {}) as Record<string, any>;
    const integrationsRaw = inner.integrations ?? cfg.integrations ?? [];
    const integrationList: string[] = Array.isArray(integrationsRaw)
      ? integrationsRaw
      : (integrationsRaw && typeof integrationsRaw === "object"
          ? Object.keys(integrationsRaw).filter((k) => integrationsRaw[k])
          : []);
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
      niche_id: t.niche_id ?? "",
      agent_type: cfg.agent_type ?? "custom",
      tone_of_voice: cfg.tone_of_voice ?? inner.toneOfVoice ?? inner?.businessContext?.toneOfVoice ?? "",
      objective: inner?.profile?.primaryGoal ?? inner.objective ?? "",
      greeting: inner?.businessContext?.greetingMessage ?? inner.greetingMessage ?? "",
      instructions: inner?.profile?.instructions ?? inner.instructions ?? "",
      enabledTools: Array.isArray(inner.enabledTools) ? inner.enabledTools : (Array.isArray(cfg.enabledTools) ? cfg.enabledTools : []),
      integrations: integrationList,
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
    if (form.platform_price_monthly < 0) {
      toast.error("O preço não pode ser negativo");
      return;
    }

    // Colunas base da tabela
    const row: Record<string, any> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description,
      category: form.category,
      min_tier: form.min_tier,
      platform_price_monthly: form.platform_price_monthly,
      features: form.features,
      demo_url: form.demo_url,
      thumbnail_url: form.thumbnail_url,
      is_exclusive: form.is_exclusive,
      is_active: form.is_active,
      niche_id: form.niche_id || null,
    };

    // Cérebro do agente modelo — só pra category "agent". Fica em agent_config,
    // com o config interno já no formato que a criação do agente e o preview leem
    // (enabledTools/integrations em config.* pra sobreviverem à criação).
    if (form.category === "agent") {
      const nicheName = niches.find((n) => n.id === form.niche_id)?.name_pt ?? "";
      row.agent_config = {
        agent_type: form.agent_type,
        description: form.description,
        tone_of_voice: form.tone_of_voice,
        model: "gemini-2.5-flash",
        provider: "auto",
        config: {
          businessContext: {
            niche: nicheName,
            toneOfVoice: form.tone_of_voice,
            greetingMessage: form.greeting,
          },
          profile: {
            instructions: form.instructions,
            primaryGoal: form.objective,
          },
          enabledTools: form.enabledTools,
          integrations: form.integrations,
          channels: ["whatsapp", "web"],
        },
      };
    }

    upsertMutation.mutate({ id: editingTemplate?.id, row });
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
                  const tierCfg = TIER_LABELS[t.min_tier] ?? TIER_LABELS.start;
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
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="hack">Hack</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
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

            {/* ── Comportamento do agente modelo ── */}
            {form.category === "agent" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Comportamento do agente modelo</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo de agente</Label>
                    <Select
                      value={form.agent_type}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, agent_type: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AGENT_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Nicho</Label>
                    <Select
                      value={form.niche_id || "none"}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, niche_id: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Sem nicho" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem nicho</SelectItem>
                        {niches.map((n) => (
                          <SelectItem key={n.id} value={n.id}>{n.name_pt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Tom de voz</Label>
                  <Input
                    value={form.tone_of_voice}
                    onChange={(e) => setForm((prev) => ({ ...prev, tone_of_voice: e.target.value }))}
                    placeholder="Ex: consultivo e direto"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Objetivo</Label>
                  <Input
                    value={form.objective}
                    onChange={(e) => setForm((prev) => ({ ...prev, objective: e.target.value }))}
                    placeholder="Ex: qualificar leads frios e agendar reuniões"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Mensagem de saudação</Label>
                  <Textarea
                    value={form.greeting}
                    onChange={(e) => setForm((prev) => ({ ...prev, greeting: e.target.value }))}
                    rows={2}
                    placeholder="Oi! Sou o assistente da [empresa]…"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Instruções (prompt operacional)</Label>
                  <Textarea
                    value={form.instructions}
                    onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                    rows={6}
                    placeholder="Como o agente deve agir, o que perguntar, o que evitar, quando encaminhar…"
                  />
                </div>

                {/* Ferramentas */}
                <div className="space-y-2">
                  <Label>Ferramentas que o agente vai usar</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(RUNTIME_TOOLS).map(([id, meta]) => {
                      const on = form.enabledTools.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleInList("enabledTools", id)}
                          className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                            on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded grid place-items-center shrink-0 ${meta.tint}`}>
                            <meta.Icon className="w-3 h-3" />
                          </span>
                          <span className="flex-1 min-w-0 truncate">{meta.label}</span>
                          {on && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Integrações */}
                <div className="space-y-2">
                  <Label>Integrações conectadas</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(INTEGRATION_TOOLS).map(([id, meta]) => {
                      const on = form.integrations.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleInList("integrations", id)}
                          className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                            on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded grid place-items-center shrink-0 ${meta.tint}`}>
                            <meta.Icon className="w-3 h-3" />
                          </span>
                          <span className="flex-1 min-w-0 truncate">{meta.label}</span>
                          {on && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

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