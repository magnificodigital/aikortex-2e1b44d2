import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateKb } from "@/hooks/use-agent-knowledge-bases";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agentId: string;
  defaultName?: string;
}

export default function CreateKbDialog({ open, onOpenChange, agentId, defaultName }: Props) {
  const create = useCreateKb();
  const [name, setName] = useState(defaultName ?? "");
  const [description, setDescription] = useState("");

  async function submit() {
    if (!name.trim()) return;
    await create.mutateAsync({ agent_id: agentId, name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova base de conhecimento</DialogTitle>
          <DialogDescription>
            Agrupe documentos relacionados (ex: produtos, FAQ, políticas) em uma base.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName ?? "Ex: Documentação de produtos"}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que esta base será usada?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!name.trim() || create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
