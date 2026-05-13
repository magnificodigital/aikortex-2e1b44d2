import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Plus, Loader2, AlertCircle } from "lucide-react";
import { useAgentKbs } from "@/hooks/use-agent-knowledge-bases";
import KnowledgeBaseCard from "./KnowledgeBaseCard";
import CreateKbDialog from "./CreateKbDialog";

interface Props {
  agentId?: string;
  isFreshNew: boolean;
  onGoToAgentTab?: () => void;
}

export default function KnowledgeBaseSection({ agentId, isFreshNew, onGoToAgentTab }: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  if (isFreshNew || !agentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bases de conhecimento alimentam o agente com documentos próprios.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">Salve o agente primeiro</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você precisa criar e salvar o agente antes de configurar sua Knowledge Base.
            </p>
          </div>
          {onGoToAgentTab && (
            <Button variant="outline" size="sm" onClick={onGoToAgentTab}>
              Voltar para Agente
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { data: kbs = [], isLoading, error } = useAgentKbs(agentId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie bases para agrupar documentos e dar contexto ao agente.
          </p>
        </div>
        {kbs.length > 0 && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Nova base
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Erro ao carregar bases: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && kbs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-4">
          <Database className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">Nenhuma base de conhecimento</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Crie sua primeira base e adicione textos, FAQs, arquivos (PDF, DOCX, TXT, MD) ou URLs públicas.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Criar primeira base
          </Button>
        </div>
      )}

      {!isLoading && kbs.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {kbs.length} base{kbs.length > 1 ? "s" : ""} configurada{kbs.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {kbs.map((kb) => (
              <KnowledgeBaseCard key={kb.id} kb={kb} agentId={agentId} />
            ))}
          </div>
        </>
      )}

      <CreateKbDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        agentId={agentId}
        defaultName={`Base ${kbs.length + 1}`}
      />
    </div>
  );
}
