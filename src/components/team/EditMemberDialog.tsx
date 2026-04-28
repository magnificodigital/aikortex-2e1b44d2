import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamMember, roleConfig, departmentConfig, statusConfig, UserRole, Department, UserStatus } from "@/types/team";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect } from "react";

interface EditMemberDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  fullName: string;
  email: string;
  role: UserRole;
  department: Department;
  jobTitle: string;
  phone: string;
  status: UserStatus;
}

const EditMemberDialog = ({ member, open, onOpenChange }: EditMemberDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();

  useEffect(() => {
    if (member) {
      reset({
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        department: member.department,
        jobTitle: member.jobTitle,
        phone: member.phone || "",
        status: member.status,
      });
    }
  }, [member, reset]);

  const onSubmit = (data: FormData) => {
    toast.success(`Dados de ${data.fullName} atualizados`);
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input {...register("fullName", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" {...register("email", { required: true })} />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input {...register("jobTitle", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input {...register("phone")} placeholder="+55 11 99999-0000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as UserStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(statusConfig) as UserStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
