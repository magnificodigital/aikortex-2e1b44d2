import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { type TaskEngineItem, type UnifiedStatus, type Priority, TEAM_MEMBERS, PROJECT_TEMPLATES } from "@/types/task-engine";
import { MOCK_CLIENTS } from "@/types/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: TaskEngineItem) => void;
}

const NewProjectDialog = ({ open, onOpenChange, onAdd }: Props) => {
  const [form, setForm] = useState({
    title: "", clientId: "", clientName: "", description: "", owner: "",
    status: "planned" as UnifiedStatus, priority: "medium" as Priority,
    startDate: "", dueDate: "", template: "", estimatedHours: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClientChange = (companyName: string) => {
    const client = MOCK_CLIENTS.find((c) => c.companyName === companyName);
    if (client) setForm((prev) => ({ ...prev, clientId: client.id, clientName: client.companyName }));
  };

  const handleSubmit = () => {
    if (!form.title || !form.clientName || !form.dueDate) {
      toast.error("Preencha pelo menos nome, cliente e prazo.");
      return;
    }
    const project: TaskEngineItem = {
      id: `proj-${Date.now()}`, task_type: "project", title: form.title, description: form.description,
      parentId: null, projectId: null, owner: form.owner || "Não atribuído", assignee: form.owner || "",
      team: [], clientId: form.clientId, clientName: form.clientName,
      startDate: form.startDate || new Date().toISOString().split("T")[0], dueDate: form.dueDate,
      createdAt: new Date().toISOString(),
      status: form.status, priority: form.priority, progress: 0,
      tags: [], estimatedHours: Number(form.estimatedHours) || 0,
      comments: [], timeEntries: [], attachments: [],
      automations: [
        { id: `auto-${Date.now()}`, event: "status_changed", action: "Notificar gerente", enabled: true },
        { id: `auto-${Date.now() + 1}`, event: "deadline_approaching", action: "Alerta 3 dias antes", enabled: true },
      ],
      template: form.template || undefined,
    };
    onAdd(project);
    toast.success(`Projeto "${form.title}" criado!`);
    setForm({ title: "", clientId: "", clientName: "", description: "", owner: "", status: "planned", priority: "medium", startDate: "", dueDate: "", template: "", estimatedHours: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Template */}
          <div className="space-y-1.5">
            <Label>Template (opcional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_TEMPLATES.map((t) => (
                <Badge
                  key={t.id}
                  variant={form.template === t.id ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => update("template", form.template === t.id ? "" : t.id)}
                >
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nome do Projeto *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ex: Implementação CRM" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.clientName} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{MOCK_CLIENTS.map((c) => <SelectItem key={c.id} value={c.companyName}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{TEAM_MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Descreva o projeto..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data de Início</Label><Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Prazo *</Label><Input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Horas estimadas</Label>
              <Input type="number" value={form.estimatedHours} onChange={(e) => update("estimatedHours", e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar Projeto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;
