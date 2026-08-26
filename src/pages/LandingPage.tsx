import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { translations, type Lang } from "@/components/landing/copy";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Opportunity from "@/components/landing/Opportunity";
import Deliverables from "@/components/landing/Deliverables";
import HowItWorks from "@/components/landing/HowItWorks";
import Differentials from "@/components/landing/Differentials";
import Features from "@/components/landing/Features";
import SocialProof from "@/components/landing/SocialProof";
import LaunchCTA from "@/components/landing/LaunchCTA";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("app-lang") as Lang) || "pt");

  const navigate = useNavigate();
  const { user, loading, getRedirectPath, isRecovery } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const isDark = theme === "dark";
  const t = translations[lang];

  const handleLangChange = (value: string) => {
    const next = value as Lang;
    setLang(next);
    localStorage.setItem("app-lang", next);
  };

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  useEffect(() => {
    // Recuperação de senha tem prioridade sobre o redirect normal — senão o
    // usuário cai na home logado pelo token de recovery e sem trocar a senha.
    if (isRecovery) {
      navigate("/reset-password");
      return;
    }
    if (!loading && user) {
      navigate(getRedirectPath());
    }
  }, [user, loading, navigate, getRedirectPath, isRecovery]);

  const sectionProps = { t, isDark, openAuth };

  return (
    <div className={`min-h-screen landing-bg ${isDark ? "bg-[#0a0a0f] text-white" : "bg-white text-foreground"}`}>
      <div className="landing-bg-orb" />
      <div className="landing-stars" aria-hidden="true" />

      <Navbar
        t={t}
        isDark={isDark}
        lang={lang}
        onLangChange={handleLangChange}
        toggleTheme={toggleTheme}
        openAuth={openAuth}
      />

      <main className="relative">
        <Hero {...sectionProps} />
        <Opportunity {...sectionProps} />
        <Deliverables {...sectionProps} />
        <HowItWorks {...sectionProps} />
        <Differentials {...sectionProps} />
        <Features {...sectionProps} />
        <SocialProof {...sectionProps} />
        <LaunchCTA {...sectionProps} />
        <Footer {...sectionProps} />
      </main>

      <AuthModal open={showAuth} mode={authMode} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default LandingPage;
