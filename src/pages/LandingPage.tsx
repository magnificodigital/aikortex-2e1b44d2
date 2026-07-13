import { useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import { Monitor, Sparkles, Globe, ArrowUp, Plus, RefreshCw, Sun, Moon, ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";

const translations = {
  pt: {
    agents: "Agentes",
    templates: "Templates",
    pricing: "Preços",
    signIn: "Entrar",
    startFree: "Comece grátis",
    ctaExperts: "Fale com nossos especialistas",
    newBadge: "Novo",
    banner: "Conheça os Agentes IA que trabalham 24/7",
    heroTitle1: "Infinitas ",
    heroTitle2: "possibilidades",
    heroSubtitle: "Crie agentes inteligentes e gerencie seu negócio de forma simples e sem complicação.",
    placeholder: "Crie um app que...",
    suggestions: {
      app: [
        ["Construtor de Formulários", "Dashboard de Vendas", "Landing Page"],
        ["Sistema de Tarefas", "Painel Financeiro", "CRM Completo"],
        ["E-commerce Simples", "Blog com IA", "Portal de Clientes"],
      ],
      agentes: [
        ["Agente SDR para WhatsApp", "Agente de Suporte 24/7", "Agente de Qualificação"],
        ["Agente BDR LinkedIn", "Agente CS Pós-Venda", "Agente de Pesquisa"],
        ["Agente de Onboarding", "Agente Cobranças", "Agente Agendamento"],
      ],
      flows: [
        ["Fluxo de Onboarding", "Automação de E-mail", "Pipeline de Vendas"],
        ["Nutrição de Leads", "Fluxo Pós-Compra", "Workflow de Aprovação"],
        ["Integração CRM + WhatsApp", "Fluxo de Cobrança", "Sequência Follow-up"],
      ],
    },
  },
  en: {
    agents: "Agents",
    templates: "Templates",
    pricing: "Pricing",
    signIn: "Sign in",
    startFree: "Start free",
    ctaExperts: "Talk to our specialists",
    newBadge: "New",
    banner: "Meet the AI Agents that work 24/7",
    heroTitle1: "Infinite ",
    heroTitle2: "possibilities",
    heroSubtitle: "Create intelligent agents and manage your business simply and hassle-free.",
    placeholder: "Create an app that...",
    suggestions: {
      app: [
        ["Form Builder", "Sales Dashboard", "Landing Page"],
        ["Task System", "Financial Panel", "Full CRM"],
        ["Simple E-commerce", "AI Blog", "Client Portal"],
      ],
      agentes: [
        ["SDR Agent for WhatsApp", "24/7 Support Agent", "Qualification Agent"],
        ["BDR LinkedIn Agent", "Post-Sale CS Agent", "Research Agent"],
        ["Onboarding Agent", "Collections Agent", "Scheduling Agent"],
      ],
      flows: [
        ["Onboarding Flow", "Email Automation", "Sales Pipeline"],
        ["Lead Nurturing", "Post-Purchase Flow", "Approval Workflow"],
        ["CRM + WhatsApp Integration", "Billing Flow", "Follow-up Sequence"],
      ],
    },
  },
};

type Lang = "pt" | "en";

const tabIcons = { app: Monitor, agentes: Sparkles, flows: Globe };

const LandingPage = () => {
  const [prompt, setPrompt] = useState("");
  const [activeCreationTab, setActiveCreationTab] = useState<"app" | "agentes" | "flows">("app");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [isPlaying, setIsPlaying] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("app-lang") as Lang) || "pt";
  });
  const navigate = useNavigate();
  const { user, loading, getRedirectPath } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const t = translations[lang];
  const currentSuggestions = t.suggestions[activeCreationTab][suggestionIndex];
  const SuggestionIcon = tabIcons[activeCreationTab];

  const handleLangChange = (value: string) => {
    const next = value as Lang;
    setLang(next);
    localStorage.setItem("app-lang", next);
    setSuggestionIndex(0);
  };

  const refreshSuggestions = useCallback(() => {
    setSuggestionIndex((prev) => (prev + 1) % translations[lang].suggestions[activeCreationTab].length);
  }, [activeCreationTab, lang]);

  const handleTabChange = (tab: "app" | "agentes" | "flows") => {
    setActiveCreationTab(tab);
    setSuggestionIndex(0);
  };

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!loading && user) {
      navigate(getRedirectPath());
    }
  }, [user, loading, navigate, getRedirectPath]);

  const isDark = theme === "dark";
  const bg = isDark ? "bg-[#0a0a0f] text-white" : "bg-white text-foreground";
  const borderColor = isDark ? "border-white/5" : "border-border";
  const textMuted = isDark ? "text-white/60" : "text-muted-foreground";
  const textLight = isDark ? "text-white/40" : "text-muted-foreground/70";
  const textHover = isDark ? "hover:text-white" : "hover:text-foreground";
  const cardBg = isDark ? "border-white/10 bg-white/[0.03] backdrop-blur-sm" : "border-border bg-card";
  const bannerBg = isDark ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10" : "border-border bg-muted text-muted-foreground hover:bg-accent";
  const suggBorder = isDark ? "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20";
  const inputText = isDark ? "text-white/80 placeholder:text-white/20" : "text-foreground placeholder:text-muted-foreground";
  const tabInactive = isDark ? "text-white/40 hover:text-white/60" : "text-muted-foreground hover:text-foreground";
  const heroText1 = isDark ? "text-white/90" : "text-foreground";
  const heroText2 = isDark ? "text-white/80" : "text-foreground/80";

  return (
    <div className={`min-h-screen ${bg} flex flex-col landing-bg`}>
      <div className="landing-bg-orb" />

      {/* Rising stars background — CSS-only for performance */}
      <div className="landing-stars" aria-hidden="true" />

      {/* Top Navbar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 h-14">
        <div className="flex items-center gap-6" />


        {/* Desktop actions */}
        <div className={`hidden md:flex items-center gap-3 text-sm ${textMuted}`}>
          <button onClick={toggleTheme} className={`p-2 rounded-lg ${textHover} transition-colors`}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Select value={lang} onValueChange={handleLangChange}>
            <SelectTrigger className="h-8 w-8 justify-center border-none bg-transparent p-0 focus:ring-0 text-white" aria-label="Language">
              <SelectValue placeholder="BR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">BR</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => openAuthModal("signin")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-medium ${bannerBg} transition-colors`}
          >
            {t.signIn}
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-lg ${textHover} transition-colors`}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg ${textHover} transition-colors`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <div className={`absolute top-14 left-0 right-0 z-20 md:hidden border-b ${borderColor} ${isDark ? "bg-[#0a0a0f]/95 backdrop-blur-xl" : "bg-white/95 backdrop-blur-xl"} animate-in slide-in-from-top-2 duration-200`}>
            <div className="flex flex-col px-5 py-4 gap-1">
              <div className={`my-2 border-t ${borderColor}`} />

              <Select value={lang} onValueChange={(v) => { handleLangChange(v); setMobileMenuOpen(false); }}>
                <SelectTrigger className={`h-9 w-full justify-center gap-2 border ${isDark ? "border-white/10 bg-white/5 text-white" : "border-border bg-muted text-foreground"} px-3 text-sm focus:ring-0 rounded-lg`} aria-label="Language">
                  <SelectValue placeholder="BR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">BR</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-col gap-2 mt-3">
                <button
                  onClick={() => openAuthModal("signin")}
                  className={`w-full py-2.5 rounded-full text-sm font-medium border ${bannerBg} transition-colors`}
                >
                  {t.signIn}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Centered Aikortex Logo above banner */}
        <img
          src={isDark ? aikortexLogoWhite : aikortexLogoBlack}
          alt="Aikortex"
          className="h-12 sm:h-14 w-auto object-contain mb-6"
        />

        {/* Subtitle */}
        <p className={`text-base lg:text-lg ${textLight} text-center max-w-lg mb-10 leading-relaxed whitespace-pre-line`}>
          {t.heroSubtitle}
        </p>

        {/* Video Player */}
        <div className="w-full max-w-3xl mb-8 group">
          <div className={`relative aspect-video rounded-2xl overflow-hidden border shadow-2xl transition-transform duration-300 ${isDark ? "border-white/10" : "border-border"} ${cardBg}`}>
            {!isPlaying ? (
              <>
                <img
                  src="https://img.youtube.com/vi/QyDYR1bwznw/maxresdefault.jpg"
                  alt="Aikortex — Demo"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover overlay with controls */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 pointer-events-none group-hover:pointer-events-auto">
                  <div className="flex items-center justify-between text-white/80 text-xs">
                    <span className="font-medium">Aikortex — Demo</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/95 text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 pointer-events-auto"
                    aria-label="Play"
                  >
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                  <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-white/80 rounded-full" />
                  </div>
                </div>
              </>
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/QyDYR1bwznw?rel=0&modestbranding=1&start=56&autoplay=1"
                title="Aikortex — Demo"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => openAuthModal("signup")}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            (e.currentTarget as HTMLButtonElement).style.setProperty("--mouse-x", `${x}%`);
            (e.currentTarget as HTMLButtonElement).style.setProperty("--mouse-y", `${y}%`);
          }}
          className="cta-glow-btn flex items-center gap-2 mb-8 px-7 py-3.5 rounded-full text-sm font-medium"
        >
          {t.ctaExperts}
          <ArrowRight className="w-4 h-4 arrow-icon" />
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal open={showAuth} mode={authMode} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default LandingPage;
