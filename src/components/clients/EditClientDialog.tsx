import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, PowerOff, Power } from "lucide-react";

export type AgencyClientLite = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: string | null;
};

interface Props {
  client: AgencyClientLite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}

interface FormData {
  client_name: string;
  client_email: string;
  client_phone: string;
}

const EditClientDialog = ({ client, open, onOpenChange, onChanged }: Props) => {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>();
  const [showHardDelete, setShowHardDelete] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [hardDeleting, setHardDeleting] = useState(false);

  useEffect(() => {
    if (client && open) {
      reset({
        client_name: client.client_name,
        client_email: client.client_email ?? "",
        client_phone: client.client_phone ?? "",
      });
      setTypedName("");
      setShowHardDelete(false);
    }
  }, [client, open, reset]);

  if (!client) return null;

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase
      .from("agency_clients")
      .update({
        client_name: data.client_name.trim(),
        client_email: data.client_email.trim() || null,
        client_phone: data.client_phone.trim() || null,
      })
      .eq("id", client.id);
    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
      return;
    }
    toast.success("Cliente atualizado");
    await onChanged();
    onOpenChange(false);
  };

  const isActive = client.status === "active";

  const handleToggleStatus = async () => {
    const newStatus = isActive ? "inactive" : "active";
    setTogglingStatus(true);
    const { error } = await supabase
      .from("agency_clients")
      .update({ status: newStatus })
      .eq("id", client.id);
    setTogglingStatus(false);
    if (error) {
      toast.error(`Erro: ${error.message}`);
      return;
    }
    toast.success(newStatus === "active" ? "Cliente reativado" : "Cliente desativado");
    await onChanged();
    onOpenChange(false);
  };

  const handleHardDelete = async () => {
    setHardDeleting(true);
    const { error } = await supabase
      .from("agency_clients")
      .delete()
      .eq("id", client.id);
    setHardDeleting(false);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return;
    }
    toast.success("Cliente excluído permanentemente");
    setShowHardDelete(false);
    await onChanged();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Atualize as informações de contato do cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Nome</Label>
              <Input id="client_name" {...register("client_name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_email">Email</Label>
              <Input id="client_email" type="email" {...register("client_email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_phone">Telefone</Label>
              <Input id="client_phone" {...register("client_phone")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>Salvar</Button>
            </div>
          </form>

          <div className="border-t border-border mt-6 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h4 className="text-destructive font-semibold text-sm">Danger Zone</h4>
            </div>
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleToggleStatus}
                  disabled={togglingStatus}
                  className="w-full"
                >
                  {isActive ? "Desativar cliente" : "Reativar cliente"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {isActive
                    ? "Pausa o cliente. Dados preservados. Pode reativar a qualquer momento."
                    : "Reativa o cliente. Operação volta ao normal."}
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowHardDelete(true)}
                  className="w-full"
                >
                  Excluir permanentemente
                </Button>
                <p className="text-xs text-muted-foreground">
                  Remove o cliente e dados relacionados (tabelas, KBs, conversas).
                  Não é possível desfazer.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showHardDelete} onOpenChange={setShowHardDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove <strong>{client.client_name}</strong> e todos os dados:
              tabelas, knowledge bases, conversas, históricos. Agentes vinculados perdem
              o vínculo mas não são apagados.
              <br /><br />
              Para confirmar, digite o nome do cliente abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={client.client_name}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={typedName !== client.client_name || hardDeleting}
              onClick={handleHardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {hardDeleting ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditClientDialog;
