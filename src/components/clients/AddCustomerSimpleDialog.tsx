import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SimpleCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  website: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (c: SimpleCustomer) => void;
  initial?: SimpleCustomer | null;
}

// Cadastro de cliente DO cliente (clientes-do-cliente). Sem acesso, sem
// templates, sem cobrança — só os dados de contato/empresa.
// Persistência multi-tenant (tabela client_customers com client_id) virá
// em F2/F3. Por enquanto vive no estado local da tela.
const AddCustomerSimpleDialog = ({ open, onOpenChange, onCreate, initial }: Props) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmail(initial?.email ?? "");
      setPhone(initial?.phone ?? "");
      setCnpj(initial?.cnpj ?? "");
      setAddress(initial?.address ?? "");
      setWebsite(initial?.website ?? "");
    }
  }, [open, initial]);

  const handleSave = () => {
    if (!name.trim()) return;
    onCreate({
      id: initial?.id ?? `local-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      cnpj: cnpj.trim() || null,
      address: address.trim() || null,
      website: website.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Dados de contato e da empresa.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato ou empresa" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <Label>Site da empresa</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://empresa.com" />
            </div>
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade, estado" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerSimpleDialog;
