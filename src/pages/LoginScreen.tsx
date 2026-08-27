import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";

/**
 * Tela de login do PRODUTO (app.aikortex.com e dash.aikortex.com).
 * NÃO é landing de marketing (essa fica só em aikortex.com). Não logado → login;
 * logado → redireciona pro destino certo (getRedirectPath: /home ou /admin).
 * Fundo escuro + animado (orb/estrelas), igual à landing principal.
 */
const LoginScreen = () => {
  const navigate = useNavigate();
  const { user, loading, getRedirectPath, isRecovery } = useAuth();

  const initialMode = new URLSearchParams(window.location.search).get("auth") === "signup"
    ? "signup" : "signin";
  const [showAuth, setShowAuth] = useState(true);

  useEffect(() => {
    if (isRecovery) { navigate("/reset-password"); return; }
    if (!loading && user) navigate(getRedirectPath());
  }, [user, loading, isRecovery, navigate, getRedirectPath]);

  // Força tema escuro enquanto a tela de login está montada — o fundo animado
  // (orb/feixes/estrelas) é gated por `.dark` no CSS. A tela ocupa a viewport
  // inteira (sem app atrás), então isso não afeta o resto. Restaura ao sair.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => { if (!had) root.classList.remove("dark"); };
  }, []);

  return (
    <div className="min-h-screen landing-bg flex items-center justify-center px-4 bg-[#0a0a0f] text-white">
      <div className="landing-bg-orb" />
      <div className="landing-stars" aria-hidden="true" />

      <AuthModal open={showAuth} mode={initialMode} dismissible={false} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default LoginScreen;
