import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleConfig, departmentConfig, UserRole, Department } from "@/types/team";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  fullName: string;
  email: string;
  role: UserRole;
  department: Department;
  jobTitle: string;
}

const InviteMemberDialog = ({ open, onOpenChange }: InviteMemberDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { role: "member", department: "operations" },
  });

  const onSubmit = (data: FormData) => {
    toast.success(`Convite enviado para ${data.email}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input {...register("fullName", { required: true })} placeholder="Nome do membro" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" {...register("email", { required: true })} placeholder="email@agency.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleConfig) as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{roleConfig[r].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={watch("department")} onValueChange={(v) => setValue("department", v as Department)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(departmentConfig) as Department[]).map((d) => (
                    <SelectItem key={d} value={d}>{departmentConfig[d].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input {...register("jobTitle", { required: true })} placeholder="Ex: Developer, Designer..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Enviar Convite</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
