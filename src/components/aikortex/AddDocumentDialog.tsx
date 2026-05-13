import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import IngestDocumentTabs from "./IngestDocumentTabs";
import type { AgentKnowledgeBase } from "@/hooks/use-agent-knowledge-bases";

type Mode = "text" | "faq" | "file" | "url";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agentId: string;
  kb: AgentKnowledgeBase;
  initialTab?: Mode;
}

export default function AddDocumentDialog({ open, onOpenChange, agentId, kb, initialTab = "text" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar documento</DialogTitle>
          <DialogDescription>
            Será adicionado em <span className="font-medium text-foreground">{kb.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <IngestDocumentTabs agentId={agentId} kbId={kb.id} initialTab={initialTab} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
