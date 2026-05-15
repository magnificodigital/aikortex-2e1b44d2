import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateClientTable, slugifyKey, type ClientTableColumn, type ColumnType } from "@/hooks/use-client-tables";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
}

type Draft = { label: string; key: string; type: ColumnType; keyTouched: boolean };

const TYPE_LABELS: Record<ColumnType, string> = {
  text: "Texto",
  number: "Número",
  boolean: "Sim/Não",
};

export default function CreateClientTableDialog({ open, onOpenChange, clientId }: Props) {
  const create = useCreateClientTable();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cols, setCols] = useState<Draft[]>([
    { label: "", key: "", type: "text", keyTouched: false },
  ]);

  function reset() {
    setName("");
    setDescription("");
    setCols([{ label: "", key: "", type: "text", keyTouched: false }]);
  }

  function updateCol(i: number, patch: Partial<Draft>) {
    setCols((prev) =>
      prev.map((c, idx) => {
        if (idx !== i) return c;
        const next = { ...c, ...patch };
        if (patch.label !== undefined && !c.keyTouched) {
          next.key = slugifyKey(patch.label);
        }
        if (patch.key !== undefined) {
          next.key = slugifyKey(patch.key);
          next.keyTouched = true;
        }
        return next;
      })
    );
  }

  function addCol() {
    if (cols.length >= 20) {
      toast.error("Máximo de 20 colunas");
      return;
    }
    setCols((p) => [...p, { label: "", key: "", type: "text", keyTouched: false }]);
  }

  function removeCol(i: number) {
    setCols((p) => p.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Nome da tabela é obrigatório");
      return;
    }
    if (cols.length === 0) {
      toast.error("Adicione pelo menos uma coluna");
      return;
    }
    const cleaned: ClientTableColumn[] = [];
    const seen = new Set<string>();
    for (const c of cols) {
      const key = (c.key || slugifyKey(c.label)).trim();
      const label = c.label.trim();
      if (!key || !label) {
        toast.error("Toda coluna precisa de nome e identificador");
        return;
      }
      if (seen.has(key)) {
        toast.error(`Identificador duplicado: ${key}`);
        return;
      }
      seen.add(key);
      cleaned.push({ key, label, type: c.type });
    }
    try {
      await create.mutateAsync({
        client_id: clientId,
        name: trimmedName,
        description: description.trim() || null,
        columns: cleaned,
      });
      reset();
      onOpenChange(false);
    } catch {
      /* toast already shown */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova tabela</DialogTitle>
          <DialogDescription>Crie uma tabela de dados para este cliente. As colunas não podem ser editadas após a criação.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da tabela *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pacientes" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cadastro dos pacientes da clínica" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Colunas * ({cols.length}/20)</Label>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addCol}>
                <Plus className="w-3.5 h-3.5" /> Adicionar coluna
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border p-2 bg-muted/20">
              <div className="grid grid-cols-[1fr_1fr_120px_32px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-1">
                <span>Nome de exibição</span>
                <span>Identificador</span>
                <span>Tipo</span>
                <span></span>
              </div>
              {cols.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_32px] gap-2 items-center">
                  <Input
                    value={c.label}
                    onChange={(e) => updateCol(i, { label: e.target.value })}
                    placeholder="Nome"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={c.key}
                    onChange={(e) => updateCol(i, { key: e.target.value })}
                    placeholder="nome"
                    className="h-8 text-xs font-mono"
                  />
                  <Select value={c.type} onValueChange={(v) => updateCol(i, { type: v as ColumnType })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as ColumnType[]).map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCol(i)}
                    disabled={cols.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar tabela
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
