import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

/**
 * Tela de definir nova senha (fluxo de recuperação). O link do e-mail de
 * recuperação estabelece uma sessão de recovery (supabase-js processa o hash);
 * aqui o usuário digita a nova senha → supabase.auth.updateUser({ password }).
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      setReady(ok);
      setChecking(false);
      if (!ok) setError("Link inválido ou expirado. Peça um novo e-mail de recuperação.");
    };
    // Já pode haver sessão (hash processado no load); e escutamos o evento
    // PASSWORD_RECOVERY/SIGNED_IN caso o processamento termine depois.
    supabase.auth.getSession().then(({ data }) => { if (data.session) finish(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish(true);
    });
    const t = setTimeout(() => finish(false), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) { setError(err.message || "Não foi possível alterar a senha."); return; }
    toast.success("Senha alterada! Entre com a nova senha.");
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-5 border border-border rounded-2xl p-6 bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-semibold">Definir nova senha</h1>
        </div>

        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Validando link…
          </div>
        ) : !ready ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Voltar ao início</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando…</> : "Salvar nova senha"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
