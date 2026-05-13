import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import IngestDocumentTabs from "./IngestDocumentTabs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agentId: string;
  kbId: string;
  kbName: string;
}

export default function AddDocumentDialog({ open, onOpenChange, agentId, kbId, kbName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar documento</DialogTitle>
          <DialogDescription>
            Será adicionado em <span className="font-medium text-foreground">{kbName}</span>.
          </DialogDescription>
        </DialogHeader>
        <IngestDocumentTabs agentId={agentId} kbId={kbId} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
