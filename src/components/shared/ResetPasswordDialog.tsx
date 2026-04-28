import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ResetPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const ResetPasswordDialog = ({ open, onClose, userId, userName }: ResetPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError("Senha deve ter no mínimo 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("update-user-password", {
        body: { user_id: userId, new_password: password },
      });

      if (fnError || data?.error) {
        setError(data?.error || "Erro ao redefinir senha");
        setLoading(false);
        return;
      }

      toast.success(`Senha de ${userName} redefinida com sucesso`);
      handleClose();
    } catch {
      setError("Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Redefinir Senha
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Redefinindo senha de <strong>{userName}</strong></p>
        <div className="space-y-3">
          <div>
            <Label>Nova senha</Label>
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
            <Label>Confirmar senha</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Redefinir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
