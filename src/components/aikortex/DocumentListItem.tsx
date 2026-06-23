import { useState } from "react";
import { FileText, Globe, Type, HelpCircle, FileQuestion, Trash2, Loader2, AlertCircle, Check, Clock, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeleteDocument, type KnowledgeDocument } from "@/hooks/use-agent-knowledge-bases";
import EditDocumentDialog from "./EditDocumentDialog";

interface Props {
  doc: KnowledgeDocument;
  kbId: string;
}

const ICON_MAP = {
  file: FileText,
  url: Globe,
  text: Type,
  faq: HelpCircle,
} as const;

export default function DocumentListItem({ doc, kbId }: Props) {
  const del = useDeleteDocument();
  const Icon = ICON_MAP[doc.source_type] ?? FileQuestion;
  const [editOpen, setEditOpen] = useState(false);

  const statusBadge = (() => {
    switch (doc.status) {
      case "pending":
        return <Badge variant="outline" className="gap-1 text-[10px]"><Clock className="w-3 h-3" /> Aguardando</Badge>;
      case "processing":
        return <Badge variant="outline" className="gap-1 text-[10px] border-blue-500/40 text-blue-600"><Loader2 className="w-3 h-3 animate-spin" /> Processando</Badge>;
      case "ready":
        return <Badge variant="outline" className="gap-1 text-[10px] border-green-500/40 text-green-600"><Check className="w-3 h-3" /> Pronto</Badge>;
      case "failed":
        return <Badge variant="outline" className="gap-1 text-[10px] border-destructive/40 text-destructive"><AlertCircle className="w-3 h-3" /> Falhou</Badge>;
    }
  })();

  function handleDelete() {
    if (confirm(`Excluir "${doc.title ?? "documento"}"?`)) {
      del.mutate({ doc_id: doc.id, kb_id: kbId });
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{doc.title ?? "Sem título"}</p>
        {doc.status === "ready" && doc.chunks_count > 0 && (
          <p className="text-[11px] text-muted-foreground">{doc.chunks_count} chunk{doc.chunks_count !== 1 ? "s" : ""}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {doc.status === "failed" && doc.error_message && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="w-3.5 h-3.5 text-destructive cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{doc.error_message}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {statusBadge}
        <button
          onClick={() => setEditOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Editar documento"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={del.isPending}
          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
          aria-label="Excluir documento"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <EditDocumentDialog open={editOpen} onOpenChange={setEditOpen} doc={doc} kbId={kbId} />
    </div>
  );
}
