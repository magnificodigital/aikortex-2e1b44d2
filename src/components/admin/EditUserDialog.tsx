import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    user_id: string;
    full_name: string | null;
    email?: string | null;
    role: string;
    tenant_type: string;
    is_active: boolean;
  } | null;
}

const allRoles = [
  { value: "platform_owner", label: "Admin (Plataforma)" },
  { value: "platform_admin", label: "Admin da Plataforma" },
  { value: "agency_owner", label: "Agência" },
  { value: "agency_admin", label: "Admin da Agência" },
  { value: "agency_manager", label: "Gerente" },
  { value: "agency_member", label: "Membro" },
  { value: "client_owner", label: "Cliente" },
  { value: "client_viewer", label: "Visualizador" },
];

const getTenantTypeFromRole = (role: string) => {
  if (["platform_owner", "platform_admin"].includes(role)) return "platform";
  if (["client_owner", "client_viewer"].includes(role)) return "client";
  return "agency";
};

const EditUserDialog = ({ open, onClose, onSuccess, user }: EditUserDialogProps) => {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [tenantType, setTenantType] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && user) {
      setFullName(user.full_name || "");
      setRole(user.role);
      setTenantType(getTenantTypeFromRole(user.role));
      setIsActive(user.is_active);
      setError("");
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const body: Record<string, any> = { user_id: user.user_id };
      const resolvedTenantType = getTenantTypeFromRole(role);

      if (fullName.trim() !== (user.full_name || "")) body.full_name = fullName.trim();
      if (role !== user.role) body.role = role;
      if (resolvedTenantType !== user.tenant_type || role !== user.role) body.tenant_type = resolvedTenantType;
      if (isActive !== user.is_active) body.is_active = isActive;

      const { data, error: fnError } = await supabase.functions.invoke("admin-users", {
        body: { action: "update", ...body },
      });

      if (fnError || data?.error) {
        const errMsg = typeof data?.error === "string" ? data.error : JSON.stringify(data?.error);
        setError(errMsg || "Erro ao atualizar usuário");
        setLoading(false);
        return;
      }

      toast.success("Usuário atualizado com sucesso");
      onClose();
      onSuccess();
    } catch {
      setError("Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo" />
          </div>

          <div>
            <Label>E-mail</Label>
            <Input value={user.email || ""} disabled className="bg-muted" />
            <p className="text-[10px] text-muted-foreground mt-1">E-mail não pode ser alterado por aqui.</p>
          </div>

          <Separator />

          <div>
            <Label>Papel / Role</Label>
            <Select value={role} onValueChange={(value) => { setRole(value); setTenantType(getTenantTypeFromRole(value)); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de tenant</Label>
            <Select value={tenantType} onValueChange={setTenantType} disabled>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">Plataforma</SelectItem>
                <SelectItem value="agency">Agência</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Conta ativa</Label>
              <p className="text-xs text-muted-foreground">Desativar impede o login</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
