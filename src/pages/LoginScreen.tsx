import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";

/**
 * Tela de login do PRODUTO (app.aikortex.com e dash.aikortex.com).
 * NÃO é landing de marketing (essa fica só em aikortex.com). Não logado → login;
 * logado → redireciona pro destino certo (getRedirectPath: /home ou /admin).
 */
const LoginScreen = () => {
  const navigate = useNavigate();
  const { user, loading, getRedirectPath, isRecovery } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const initialMode = new URLSearchParams(window.location.search).get("auth") === "signup"
    ? "signup" : "signin";
  const [showAuth, setShowAuth] = useState(true);

  useEffect(() => {
    if (isRecovery) { navigate("/reset-password"); return; }
    if (!loading && user) navigate(getRedirectPath());
  }, [user, loading, isRecovery, navigate, getRedirectPath]);

  return (
    <div className={`min-h-screen landing-bg flex flex-col items-center justify-center gap-6 px-4 ${isDark ? "bg-[#0a0a0f] text-white" : "bg-white text-foreground"}`}>
      <div className="landing-bg-orb" />
      <div className="landing-stars" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-2">
          <img src="/aikortex-icon.png" alt="Aikortex" className="w-9 h-9" />
          <span className="text-2xl font-bold tracking-tight">Aikortex</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Entre para criar seus agentes e gerenciar seu negócio.
        </p>
        {!showAuth && (
          <Button size="lg" className="rounded-full px-8" onClick={() => setShowAuth(true)}>
            Entrar
          </Button>
        )}
      </div>

      <AuthModal open={showAuth} mode={initialMode} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default LoginScreen;
