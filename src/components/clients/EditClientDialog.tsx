import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Client, ClientStatus } from "@/types/client";
import { toast } from "sonner";

interface EditClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  companySize: string;
  status: ClientStatus;
  accountManager: string;
}

const EditClientDialog = ({ client, open, onOpenChange }: EditClientDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();

  useEffect(() => {
    if (client && open) {
      reset({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        website: client.website,
        industry: client.industry,
        companySize: client.companySize,
        status: client.status,
        accountManager: client.accountManager,
      });
    }
  }, [client, open, reset]);

  const onSubmit = (data: FormData) => {
    console.log("Updated client:", data);
    toast.success(`Cliente "${data.companyName}" atualizado com sucesso!`);
    onOpenChange(false);
  };

  const status = watch("status");
  const accountManager = watch("accountManager");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Empresa</Label>
              <Input id="companyName" {...register("companyName", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contato</Label>
              <Input id="contactName" {...register("contactName", { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register("website")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Indústria</Label>
              <Input id="industry" {...register("industry")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as ClientStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gerente</Label>
              <Select value={accountManager} onValueChange={(v) => setValue("accountManager", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maria Silva">Maria Silva</SelectItem>
                  <SelectItem value="João Costa">João Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companySize">Tamanho da Empresa</Label>
            <Input id="companySize" {...register("companySize")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
