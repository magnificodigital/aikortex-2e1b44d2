import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teamMembers } from "@/types/task";
import { toast } from "sonner";
import { useState } from "react";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewTaskDialog = ({ open, onOpenChange }: NewTaskDialogProps) => {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    toast.success("Tarefa criada com sucesso!");
    setTitle("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Configurar automação de emails" className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Descrição</Label>
            <Textarea placeholder="Descreva a tarefa..." className="text-sm min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Projeto</Label>
              <Select>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Automação de Vendas</SelectItem>
                  <SelectItem value="2">Website Institucional</SelectItem>
                  <SelectItem value="3">Agente de Voz IA</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Responsável</Label>
              <Select>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Prioridade</Label>
              <Select>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="review">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data de Início</Label>
              <Input type="date" className="h-9 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Prazo</Label>
              <Input type="date" className="h-9 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Esforço Estimado (h)</Label>
              <Input type="number" placeholder="8" className="h-9 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tags</Label>
              <Input placeholder="automação, ia" className="h-9 text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" size="sm">Criar Tarefa</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskDialog;
