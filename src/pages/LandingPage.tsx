import { useState, useEffect, useCallback, useRef } from "react";

import { useNavigate } from "react-router-dom";
import aikortexLogoWhite from "@/assets/aikortex-logo-white.png";
import aikortexLogoBlack from "@/assets/aikortex-logo-black.png";
import { Monitor, Sparkles, Globe, ArrowUp, Plus, RefreshCw, Sun, Moon, ChevronDown, Menu, X } from "lucide-react";
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
    heroSubtitle: "Crie Agentes inteligentes e Aplicações para Whatsapp e Web\nem minutos conversando com a inteligência artificial.",
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
    heroSubtitle: "Create intelligent Agents and Applications for WhatsApp and Web\nin minutes chatting with artificial intelligence.",
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
      {/* Top Navbar */}
      <header className={`relative z-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 h-14 border-b ${borderColor}`}>
        <div className="flex items-center gap-6">
          <img src={isDark ? aikortexLogoWhite : aikortexLogoBlack} alt="Aikortex" className="h-8 w-auto object-contain" />
        </div>

        {/* Desktop actions */}
        <div className={`hidden md:flex items-center gap-3 text-sm ${textMuted}`}>
          <button onClick={toggleTheme} className={`p-2 rounded-lg ${textHover} transition-colors`}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Select value={lang} onValueChange={handleLangChange}>
            <SelectTrigger className={`h-8 w-auto gap-1 border-none bg-transparent px-2 text-sm ${textMuted} ${textHover} focus:ring-0`}>
              <Globe className="w-4 h-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => openAuthModal("signin")} className={`${textHover} transition-colors`}>
            {t.signIn}
          </button>
          <button
            onClick={() => openAuthModal("signup")}
            className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
          >
            {t.startFree}
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
                <SelectTrigger className={`h-9 w-full gap-2 border ${isDark ? "border-white/10 bg-white/5" : "border-border bg-muted"} px-3 text-sm ${textMuted} focus:ring-0 rounded-lg`}>
                  <Globe className="w-4 h-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-col gap-2 mt-3">
                <button
                  onClick={() => openAuthModal("signin")}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium border ${isDark ? "border-white/10 text-white/80 hover:bg-white/5" : "border-border text-foreground hover:bg-accent"} transition-colors`}
                >
                  {t.signIn}
                </button>
                <button
                  onClick={() => openAuthModal("signup")}
                  className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
                >
                  {t.startFree}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {/* Announcement Banner */}
        <button className={`flex items-center gap-2 mb-10 px-5 py-2.5 rounded-full border text-sm ${bannerBg} transition-colors`}>
          <span className="text-[10px] font-bold uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{t.newBadge}</span>
          {t.banner}
          <span className={isDark ? "text-white/40" : "text-muted-foreground"}>→</span>
        </button>

        {/* Hero */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light text-center mb-5 tracking-tight">
          <span className={heroText1}>{t.heroTitle1}</span>
          <span className={`italic font-serif font-light ${heroText2}`}>{t.heroTitle2}</span>
        </h1>
        <p className={`text-base lg:text-lg ${textLight} text-center max-w-lg mb-12 leading-relaxed whitespace-pre-line`}>
          {t.heroSubtitle}
        </p>

        {/* CTA */}
        <button
          onClick={() => openAuthModal("signup")}
          className="group relative px-10 py-4 rounded-full overflow-hidden border border-primary/30 text-primary text-lg font-medium transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_28px_-8px_hsl(var(--primary)/0.4)] mb-8"
        >
          {t.ctaExperts}
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal open={showAuth} mode={authMode} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default LandingPage;
