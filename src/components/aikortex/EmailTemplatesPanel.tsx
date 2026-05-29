import { useMemo, useState } from "react";
import { AlertTriangle, Hash, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import EmailTemplateEditorDialog from "./EmailTemplateEditorDialog";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import {
  extractTemplateVariables,
  useDeleteEmailTemplate,
  useEmailTemplates,
  type EmailTemplate,
} from "@/hooks/use-email-templates";

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

export default function EmailTemplatesPanel() {
  const { data: emailStatus } = useEmailIntegrationStatus();
  const { data: templates = [], isLoading, isError, error } = useEmailTemplates();
  const deleteMut = useDeleteEmailTemplate();

  const [search, setSearch] = useState("");
  const [openCreator, setOpenCreator] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EmailTemplate | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.subject.toLowerCase().includes(s) ||
        stripHtml(t.body_html).toLowerCase().includes(s),
    );
  }, [templates, search]);

  if (!emailStatus?.connected) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center gap-3 text-center border-dashed">
        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
          <Mail className="w-6 h-6 text-primary/60" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-medium text-foreground">Email não conectado</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Conecte o provedor de email em <strong>Configurações → Canais → Email</strong> antes
            de criar templates.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + ação */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[11px]">
            {templates.length} {templates.length === 1 ? "template" : "templates"}
          </Badge>
        </div>
        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setOpenCreator(true)}>
          <Plus className="w-3 h-3" /> Novo template
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, assunto ou corpo…"
          className="h-9 pl-8 text-xs"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
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
          <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            {templates.length === 0 ? "Nenhum template ainda" : "Nenhum template bate com a busca"}
          </p>
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground/70 max-w-md mx-auto leading-relaxed">
              Crie templates pra reusar layouts de email nas cadências. Clica em
              <strong> Novo template</strong> pra começar.
            </p>
          )}
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px] pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((t) => {
              const vars = Array.from(
                new Set([
                  ...extractTemplateVariables(t.subject),
                  ...extractTemplateVariables(t.body_html),
                ]),
              );
              const bodyPreview = stripHtml(t.body_html);
              const updated = formatDistanceToNow(new Date(t.updated_at), {
                addSuffix: true,
                locale: ptBR,
              });
              return (
                <Card
                  key={t.id}
                  className="p-3 space-y-2 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => setEditing(t)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate" title={t.subject}>
                        {t.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(t);
                        }}
                        title="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(t);
                        }}
                        title="Remover"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {bodyPreview && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {bodyPreview}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {vars.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Hash className="w-2.5 h-2.5" /> {vars.length}{" "}
                          {vars.length === 1 ? "variável" : "variáveis"}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">atualizado {updated}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Creator */}
      <EmailTemplateEditorDialog open={openCreator} onOpenChange={setOpenCreator} />

      {/* Editor */}
      <EmailTemplateEditorDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        template={editing}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que quer remover o template <strong>{confirmDelete?.name}</strong>?
              Cadências que usam esse template vão precisar ter o conteúdo refeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={async () => {
                if (!confirmDelete) return;
                await deleteMut.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
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
