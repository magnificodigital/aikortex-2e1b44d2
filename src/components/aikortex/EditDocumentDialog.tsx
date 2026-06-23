import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateDocument, type KnowledgeDocument } from "@/hooks/use-agent-knowledge-bases";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: KnowledgeDocument | null;
  kbId: string;
}

export default function EditDocumentDialog({ open, onOpenChange, doc, kbId }: Props) {
  const update = useUpdateDocument();
  const [title, setTitle] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);

  // Lazy-load raw_content quando o dialog abre — não vem no useKnowledgeDocuments
  // pra economizar payload, então fetch separado aqui.
  useEffect(() => {
    if (!open || !doc) return;
    setTitle(doc.title ?? "");
    setRawContent("");
    if (doc.source_type !== "text" && doc.source_type !== "faq") return;
    setLoadingContent(true);
    (async () => {
      const { data } = await (supabase
        .from("kb_documents" as any)
        .select("raw_content")
        .eq("id", doc.id)
        .maybeSingle() as any);
      setRawContent(((data as { raw_content?: string } | null)?.raw_content) ?? "");
      setLoadingContent(false);
    })();
  }, [open, doc]);

  if (!doc) return null;

  const isEditable = doc.source_type === "text" || doc.source_type === "faq";

  async function handleSave() {
    if (!doc) return;
    await update.mutateAsync({
      doc_id: doc.id,
      kb_id: kbId,
      title: title.trim(),
      raw_content: isEditable ? rawContent : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>
            {isEditable
              ? "Edite o título e o conteúdo. Ao salvar, o documento é re-processado e o agente passa a usar a versão atualizada."
              : "Edite o título do documento. Conteúdo de arquivos/URLs só pode ser substituído removendo e adicionando de novo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: FAQ Contábil"
            />
          </div>

          {isEditable && (
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-xs font-medium text-foreground mb-1 block">Conteúdo (markdown ou texto livre)</label>
              {loadingContent ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando conteúdo…
                </div>
              ) : (
                <Textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Cole/escreva o conteúdo aqui…"
                  className="flex-1 min-h-[300px] font-mono text-xs"
                />
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {rawContent.length.toLocaleString()} caracteres
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !title.trim()}>
            {update.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
