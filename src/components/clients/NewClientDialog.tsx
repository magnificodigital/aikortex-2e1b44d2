import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewClientDialog = ({ open, onOpenChange }: NewClientDialogProps) => {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    companySize: "",
    status: "onboarding",
    accountManager: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.companyName || !form.contactName || !form.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos empresa, contato e email.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Cliente criado",
      description: `${form.companyName} foi adicionado com sucesso.`,
    });
    setForm({
      companyName: "", contactName: "", email: "", phone: "",
      website: "", industry: "", companySize: "", status: "onboarding",
      accountManager: "", notes: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-1.5">
              <Label>Contato *</Label>
              <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Nome do contato" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://empresa.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Indústria</Label>
              <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="Saúde">Saúde</SelectItem>
                  <SelectItem value="Finanças">Finanças</SelectItem>
                  <SelectItem value="Educação">Educação</SelectItem>
                  <SelectItem value="Varejo">Varejo</SelectItem>
                  <SelectItem value="Logística">Logística</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tamanho da Empresa</Label>
              <Select value={form.companySize} onValueChange={(v) => update("companySize", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="500+">500+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Gerente de Conta</Label>
            <Select value={form.accountManager} onValueChange={(v) => update("accountManager", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar gerente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Maria Silva">Maria Silva</SelectItem>
                <SelectItem value="João Costa">João Costa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notas adicionais sobre o cliente..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar Cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewClientDialog;
