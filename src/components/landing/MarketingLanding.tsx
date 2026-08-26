import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { translations, type Lang } from "./copy";
import Hero from "./Hero";

/** Landing pública de marketing (aikortex.com). Hero único + CTA WhatsApp. */
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
    setAuthMode(mode);
    setShowAuth(true);
  };

  useEffect(() => {
    // Links de recuperação de senha precisam levar ao fluxo de reset mesmo
    // caindo no domínio de marketing.
    if (isRecovery) navigate("/reset-password");
  }, [isRecovery, navigate]);

  return (
    <div className={`min-h-screen landing-bg ${isDark ? "bg-[#0a0a0f] text-white" : "bg-white text-foreground"}`}>
      <div className="landing-bg-orb" />
      <div className="landing-stars" aria-hidden="true" />

      {/* Header minimalista */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-end gap-2 px-4 sm:px-6 h-16 text-sm">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <Select value={lang} onValueChange={handleLangChange}>
          <SelectTrigger className="h-8 w-12 justify-center border-none bg-transparent p-0 focus:ring-0" aria-label="Language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt">BR</SelectItem>
            <SelectItem value="en">EN</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => openAuth("signin")}
          className="px-4 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.nav.signIn}
        </button>
      </header>

      <main className="relative">
        <Hero t={t} isDark={isDark} openAuth={openAuth} />
      </main>

      <AuthModal open={showAuth} mode={authMode} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default MarketingLanding;
