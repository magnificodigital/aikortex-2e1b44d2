import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hash,
  MessageSquare,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import WhatsAppTemplateCreatorDialog from "./WhatsAppTemplateCreatorDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  countTemplateVariables,
  templateBodyPreview,
  useDeleteWhatsAppTemplate,
  useWhatsAppTemplatesResponse,
  type WhatsAppTemplate,
  type WhatsAppTemplateStatus,
} from "@/hooks/use-whatsapp-templates";
import { useWhatsAppIntegrationStatus } from "@/hooks/use-whatsapp-integration";

const STATUS_META: Record<WhatsAppTemplateStatus, {
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  APPROVED: { label: "Aprovado", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  PENDING: { label: "Pendente", badge: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Clock },
  REJECTED: { label: "Rejeitado", badge: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
  PAUSED: { label: "Pausado", badge: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: PauseCircle },
  DISABLED: { label: "Desativado", badge: "bg-muted text-muted-foreground border-border", icon: XCircle },
  IN_APPEAL: { label: "Em recurso", badge: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Clock },
  PENDING_DELETION: { label: "Removendo", badge: "bg-muted text-muted-foreground border-border", icon: Trash2 },
};

export default function WhatsAppTemplatesPanel() {
  const { data: waStatus } = useWhatsAppIntegrationStatus();
  const { data: templatesResponse, isLoading, isError, error, refetch, isRefetching } = useWhatsAppTemplatesResponse();
  const templates = templatesResponse?.templates ?? [];
  const integrationError = templatesResponse?.integration_error;
  const deleteMut = useDeleteWhatsAppTemplate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | WhatsAppTemplateStatus>("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<WhatsAppTemplate | null>(null);
  const [openCreator, setOpenCreator] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (s && !t.name.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [templates, filter, search]);

  const counts = useMemo(() => {
    const c = { all: templates.length, APPROVED: 0, PENDING: 0, REJECTED: 0, PAUSED: 0 } as Record<string, number>;
    templates.forEach((t) => { c[t.status] = (c[t.status] ?? 0) + 1; });
    return c;
  }, [templates]);

  if (!waStatus?.connected) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center gap-3 text-center border-dashed">
        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-primary/60" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-medium text-foreground">WhatsApp não conectado</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Conecte sua conta WhatsApp Business em{" "}
            <strong>Recursos → Integrações → WhatsApp</strong> para listar os templates aprovados pela Meta.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com counters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            className="h-7 text-[11px]"
            onClick={() => setFilter("all")}
          >
            Todos · {counts.all ?? 0}
          </Button>
          <Button
            size="sm"
            variant={filter === "APPROVED" ? "default" : "outline"}
            className="h-7 text-[11px] gap-1"
            onClick={() => setFilter("APPROVED")}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {counts.APPROVED ?? 0}
          </Button>
          <Button
            size="sm"
            variant={filter === "PENDING" ? "default" : "outline"}
            className="h-7 text-[11px] gap-1"
            onClick={() => setFilter("PENDING")}
          >
            <Clock className="w-3 h-3 text-amber-500" /> {counts.PENDING ?? 0}
          </Button>
          <Button
            size="sm"
            variant={filter === "REJECTED" ? "default" : "outline"}
            className="h-7 text-[11px] gap-1"
            onClick={() => setFilter("REJECTED")}
          >
            <XCircle className="w-3 h-3 text-red-500" /> {counts.REJECTED ?? 0}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-3 h-3 ${isRefetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={() => setOpenCreator(true)}
          >
            <Plus className="w-3 h-3" /> Criar template
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="h-9 pl-8 text-xs"
        />
      </div>

      {integrationError?.code === "META_TOKEN_EXPIRED" && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-medium text-destructive">Token do WhatsApp expirado</p>
              <p className="text-muted-foreground">
                Atualize o System User Access Token em <strong>Recursos → Integrações → WhatsApp</strong> para voltar a listar templates.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : isError ? (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-medium text-destructive">Erro ao carregar templates</p>
              <p className="text-muted-foreground">{(error as Error)?.message}</p>
            </div>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            {templates.length === 0 ? "Nenhum template encontrado" : "Nenhum template bate com os filtros"}
          </p>
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground/70 max-w-md mx-auto leading-relaxed">
              Crie templates no Meta Business Manager (link acima) e aguarde a aprovação. Eles aparecerão aqui automaticamente.
            </p>
          )}
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px] pr-2">
          <div className="space-y-2">
            {filtered.map((t) => {
              const meta = STATUS_META[t.status] ?? STATUS_META.DISABLED;
              const StatusIcon = meta.icon;
              const body = templateBodyPreview(t);
              const varCount = countTemplateVariables(t);
              return (
                <Card key={`${t.name}-${t.language}`} className="p-3 space-y-2 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground font-mono">{t.name}</p>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${meta.badge}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {t.language}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {t.category}
                        </Badge>
                        {varCount > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Hash className="w-2.5 h-2.5" /> {varCount} {varCount === 1 ? "variável" : "variáveis"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setConfirmDelete(t)}
                      title="Remover template"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>

                  {body && (
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-3 font-mono leading-relaxed">
                      {body}
                    </p>
                  )}

                  {t.status === "REJECTED" && t.rejected_reason && (
                    <p className="text-[10px] text-destructive">
                      Motivo: {t.rejected_reason}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Creator dialog */}
      <WhatsAppTemplateCreatorDialog open={openCreator} onOpenChange={setOpenCreator} />

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que quer remover o template{" "}
              <strong className="font-mono">{confirmDelete?.name}</strong>?
              Isso vai apagar permanentemente em todos os idiomas. Cadências que usam esse template vão começar a falhar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={async () => {
                if (!confirmDelete) return;
                await deleteMut.mutateAsync(confirmDelete.name);
                setConfirmDelete(null);
                qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
