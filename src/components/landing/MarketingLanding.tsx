import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { DOMAINS, getAppMode } from "@/lib/app-domain";
import { translations, type Lang } from "./copy";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Opportunity from "./Opportunity";
import Deliverables from "./Deliverables";
import HowItWorks from "./HowItWorks";
import Differentials from "./Differentials";
import Features from "./Features";
import SocialProof from "./SocialProof";
import LaunchCTA from "./LaunchCTA";
import Footer from "./Footer";

/** Landing pública de marketing (aikortex.com). Home completa «Agência Inteligente». */
const MarketingLanding = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("app-lang") as Lang) || "pt");

  const navigate = useNavigate();
  const { isRecovery } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const isDark = theme === "dark";
  const t = translations[lang];

  const handleLangChange = (value: string) => {
    const next = value as Lang;
    setLang(next);
    localStorage.setItem("app-lang", next);
  };

  const openAuth = (mode: "signin" | "signup") => {
    // Site institucional (aikortex.com) não loga localmente — leva pro app com
    // o lightbox de login já aberto (sessão pertence ao domínio do app).
    // Em dev/preview (?view=marketing) mantém o modal pra testar.
    if (getAppMode() === "site") {
      window.location.href = `${DOMAINS.app}/?auth=${mode === "signup" ? "signup" : "login"}`;
      return;
    }
    setAuthMode(mode);
    setShowAuth(true);
  };

  useEffect(() => {
    // Links de recuperação de senha precisam levar ao fluxo de reset mesmo
    // caindo no domínio de marketing.
    if (isRecovery) navigate("/reset-password");
  }, [isRecovery, navigate]);

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
        {/* Demais seções ocultas por ora — só o hero principal.
        <Opportunity {...sectionProps} />
        <Deliverables {...sectionProps} />
        <HowItWorks {...sectionProps} />
        <Differentials {...sectionProps} />
        <Features {...sectionProps} />
        <SocialProof {...sectionProps} />
        <LaunchCTA {...sectionProps} />
        */}
        <Footer {...sectionProps} />
      </main>

      <AuthModal open={showAuth} mode={authMode} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default MarketingLanding;
