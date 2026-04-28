import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  context: "platform" | "agency";
  workspaceOwnerUserId?: string;
}

const platformRoles = [
  { value: "platform_owner", label: "Dono da Plataforma" },
  { value: "platform_admin", label: "Admin da Plataforma" },
];

const agencyRoles = [
  { value: "agency_admin", label: "Administrador" },
  { value: "agency_manager", label: "Gerente" },
  { value: "agency_member", label: "Membro" },
];

const departments = [
  { value: "sales", label: "Vendas" },
  { value: "operations", label: "Operações" },
  { value: "marketing", label: "Marketing" },
  { value: "automation", label: "Automação" },
  { value: "development", label: "Desenvolvimento" },
  { value: "design", label: "Design" },
  { value: "support", label: "Suporte" },
];

const getTenantTypeFromRole = (role: string) => {
  if (["platform_owner", "platform_admin"].includes(role)) return "platform";
  if (["client_owner", "client_viewer"].includes(role)) return "client";
  return "agency";
};

const CreateUserDialog = ({ open, onClose, onSuccess, context, workspaceOwnerUserId }: CreateUserDialogProps) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = context === "platform" ? platformRoles : agencyRoles;

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("");
    setDepartment("");
    setJobTitle("");
    setSendWelcome(true);
    setShowPassword(false);
    setShowConfirm(false);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    if (!fullName.trim()) return "Nome completo é obrigatório";
    if (!email.trim()) return "E-mail é obrigatório";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido";
    if (password.length < 8) return "Senha deve ter no mínimo 8 caracteres";
    if (password !== confirmPassword) return "As senhas não coincidem";
    if (!role) return "Selecione um papel";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        tenant_type: getTenantTypeFromRole(role),
        department: department || undefined,
        job_title: jobTitle.trim() || undefined,
      };

      const { data, error: fnError } = (context === "platform" || workspaceOwnerUserId)
        ? await supabase.functions.invoke("admin-users", {
            body: {
              action: "create",
              ...payload,
              workspace_owner_user_id: workspaceOwnerUserId,
            },
          })
        : await supabase.functions.invoke("create-user", {
            body: payload,
          });

      if (fnError) {
        setError((data as any)?.error || fnError.message || "Erro ao criar usuário. Tente novamente.");
        setLoading(false);
        return;
      }

      if (data?.error) {
        const errMsg = typeof data.error === "string" ? data.error : Object.values(data.error).flat().join(", ");
        setError(errMsg);
        setLoading(false);
        return;
      }

      toast.success("Usuário criado com sucesso");
      handleClose();
      onSuccess();
    } catch {
      setError("Erro ao criar usuário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Novo Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Personal info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados pessoais</p>
            <div>
              <Label>Nome completo *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <Separator />

          {/* Access config */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Configurações de acesso</p>
            <div>
              <Label>Senha *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirmar senha *</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Função/Papel *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Selecione um papel" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {context === "agency" && (
              <>
                <div>
                  <Label>Departamento</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cargo/Título</Label>
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex: Gerente de Projetos" />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-sm">Enviar e-mail de boas-vindas</Label>
              <Switch checked={sendWelcome} onCheckedChange={setSendWelcome} />
            </div>
            {sendWelcome && (
              <p className="text-xs text-muted-foreground">O usuário receberá um e-mail com suas credenciais de acesso.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Criar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
