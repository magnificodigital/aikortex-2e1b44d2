import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { Lead, LeadSource, LeadTemperature, PipelineStage, LEAD_SOURCES, PIPELINE_STAGES } from "@/types/crm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Omit<Lead, "id" | "activities" | "createdAt" | "updatedAt">) => void;
}

const NewLeadDialog = ({ open, onOpenChange, onSave }: Props) => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", position: "",
    stage: "lead" as PipelineStage, source: "manual" as LeadSource,
    temperature: "frio" as LeadTemperature, value: 0,
    assignee: "", tags: "", notes: "",
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setForm({ name: "", email: "", phone: "", company: "", position: "", stage: "lead", source: "manual", temperature: "frio", value: 0, assignee: "", tags: "", notes: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <Label className="text-xs">Empresa</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Empresa" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cargo</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Cargo" />
            </div>
            <div>
              <Label className="text-xs">Valor estimado (R$)</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Temperatura</Label>
              <Select value={form.temperature} onValueChange={(v) => setForm({ ...form, temperature: v as LeadTemperature })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frio">❄️ Frio</SelectItem>
                  <SelectItem value="morno">🌤️ Morno</SelectItem>
                  <SelectItem value="quente">🔥 Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Responsável</Label>
              <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Nome" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="SaaS, B2B, Enterprise" />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas sobre o lead..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Salvar Lead</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewLeadDialog;
