import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Monitor, Sparkles, Globe, ArrowUp, RefreshCw } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_PRESETS } from "@/types/agent-presets";
import type { AgentType } from "@/types/agent-builder";
// AgencyOnboarding disabled for now
// import AgencyOnboarding from "@/components/onboarding/AgencyOnboarding";

const suggestionsByTab = {
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
};

const tabIcons = { app: Monitor, agentes: Sparkles, flows: Globe };

const WHATSAPP_KEYWORDS = ["whatsapp", "wpp", "zap", "zapzap", "mensagem", "conversa", "chat", "atendimento", "sac", "suporte ao cliente", "cliente pelo whatsapp", "whats"];
const WEB_KEYWORDS = ["web", "site", "website", "dashboard", "portal", "painel", "landing", "página", "pagina", "sistema web", "plataforma", "saas", "aplicativo web", "app web"];

type AppChannel = "whatsapp" | "web" | null;

function detectChannel(text: string): AppChannel {
  const lower = text.toLowerCase();
  const hasWa = WHATSAPP_KEYWORDS.some((k) => lower.includes(k));
  const hasWeb = WEB_KEYWORDS.some((k) => lower.includes(k));
  if (hasWa && !hasWeb) return "whatsapp";
  if (hasWeb && !hasWa) return "web";
  if (hasWa && hasWeb) return "whatsapp"; // default to whatsapp if both
  return null;
}

const Home = () => {
  const [prompt, setPrompt] = useState("");
  const [activeCreationTab, setActiveCreationTab] = useState<"app" | "agentes" | "flows">("app");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [userName, setUserName] = useState("Usuário");
  const [detectedChannel, setDetectedChannel] = useState<AppChannel>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { user, isPlatform } = useAuth();
  const navigate = useNavigate();

  const FLOW_KEYWORDS = ["fluxo", "flow", "automação", "automatizar", "automatização", "automation", "pipeline", "workflow", "nutrição", "sequência", "automacao", "sequencia"];
  const AGENT_KEYWORDS = ["agente", "agent", "sdr", "bdr", "sac", "suporte", "atendimento", "qualificação", "qualificacao", "qualificador", "prospecção", "prospeccao", "captura de lead", "captação", "captacao", "cobranças", "cobranca", "onboarding", "customer success", "cs ", "assistente", "diagnóstico", "diagnostico", "agendador", "agendamento", "chatbot", "bot", "vendas", "vender", "retenção", "retencao", "pós-venda", "pos-venda"];

  const detectCategory = (text: string): "app" | "agentes" | "flows" => {
    const lower = text.toLowerCase();
    if (FLOW_KEYWORDS.some((k) => lower.includes(k))) return "flows";
    if (AGENT_KEYWORDS.some((k) => lower.includes(k))) return "agentes";
    return "app";
  };

  const detectAgentType = (text: string): { id: string; type: AgentType; name: string } | null => {
    const lower = text.toLowerCase();
    if (lower.includes("sdr") || lower.includes("qualificação") || lower.includes("qualificacao") || lower.includes("qualificador"))
      return { id: "sdr-1", type: "SDR", name: "Agente SDR" };
    if (lower.includes("sac") || lower.includes("suporte") || lower.includes("atendimento") || lower.includes("customer success") || lower.includes("cs "))
      return { id: "sac-1", type: "SAC", name: "Agente SAC" };
    return null; // Custom agent — no template match
  };

  const handleSubmit = () => {
    const text = prompt.trim();
    if (!text) return;

    const detected = detectCategory(text);
    if (detected !== activeCreationTab) setActiveCreationTab(detected);

    if (detected === "flows") {
      navigate("/aikortex/automations", { state: { initialPrompt: text } });
    } else if (detected === "agentes") {
      const agentInfo = detectAgentType(text);

      if (agentInfo) {
        // Template match — navigate with preset
        const preset = AGENT_PRESETS[agentInfo.type];

        // Clear stale localStorage
        const storagePrefix = `agent-detail-${agentInfo.id}`;
        try {
          ["name", "desc", "objective", "instructions", "toneOfVoice", "greetingMessage"].forEach(k =>
            localStorage.removeItem(`${storagePrefix}-${k}`)
          );
        } catch {}

        navigate(`/aikortex/agents/${agentInfo.id}`, {
          state: {
            fromTemplate: true,
            initialPrompt: text,
            preset: {
              context: preset.context,
              intents: preset.intents,
              stages: preset.stages,
              advancedConfig: preset.advancedConfig,
              agentType: agentInfo.type,
              agentName: agentInfo.name,
              agentObjective: preset.context.targetAudienceDescription || "",
            },
          },
        });
      } else {
        // No template — custom agent via wizard with user prompt
        navigate(`/aikortex/agents/new`, {
          state: {
            fromTemplate: false,
            initialPrompt: text,
            agentType: "Custom",
          },
        });
      }
    } else {
      const channel = detectedChannel || "web";
      navigate("/app-builder", { state: { initialPrompt: text, channel } });
    }
  };

  const currentSuggestions = suggestionsByTab[activeCreationTab][suggestionIndex];
  const SuggestionIcon = tabIcons[activeCreationTab];

  const refreshSuggestions = useCallback(() => {
    setSuggestionIndex((prev) => (prev + 1) % suggestionsByTab[activeCreationTab].length);
  }, [activeCreationTab]);

  const handleTabChange = (tab: "app" | "agentes" | "flows") => {
    setActiveCreationTab(tab);
    setSuggestionIndex(0);
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setUserName(data.full_name);
      });

    // Onboarding disabled — go directly to dashboard
    setOnboardingChecked(true);
  }, [user, isPlatform]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const handlePromptChange = (val: string) => {
    setPrompt(val);
    if (val.trim().length > 3) {
      const detected = detectCategory(val);
      if (detected !== activeCreationTab) setActiveCreationTab(detected);
      // detect channel only when on app tab
      if (detected === "app") {
        setDetectedChannel(detectChannel(val));
      } else {
        setDetectedChannel(null);
      }
    } else {
      setDetectedChannel(null);
    }
  };

  if (!onboardingChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  // Onboarding disabled
  // if (showOnboarding) {
  //   return <AgencyOnboarding onComplete={() => setShowOnboarding(false)} />;
  // }

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
        {/* Greeting */}
        <h1 className="text-3xl lg:text-5xl font-light text-foreground mb-3 text-center">
          {getGreeting()}, <span className="italic">{userName}</span>
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mb-10 text-center max-w-lg">
          Crie Agentes, Fluxos inteligentes e apps em<br />
          minutos conversando com IA.
        </p>

        {/* Prompt Box */}
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden mb-8">
          {/* Creation tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-1">
            {(["app", "agentes", "flows"] as const).map((tab) => {
              const labels = { app: "App", agentes: "Agentes", flows: "Flows" };
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCreationTab === tab
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  {tab === "app" && <Monitor className="w-4 h-4" />}
                  {tab === "agentes" && <Sparkles className="w-4 h-4" />}
                  {tab === "flows" && <Globe className="w-4 h-4" />}
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Text area */}
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={
              activeCreationTab === "app"
                ? "Descreva o app que você quer criar..."
                : activeCreationTab === "agentes"
                ? "Descreva o agente que você precisa..."
                : "Descreva o fluxo que você quer automatizar..."
            }
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 px-5 py-3 min-h-[90px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-1.5">
              {activeCreationTab === "app" && (
                <>
                  <button
                    onClick={() => setDetectedChannel("web")}
                    className={`flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition-all ${
                      detectedChannel === "web" || !detectedChannel
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Web App
                  </button>
                  <button
                    onClick={() => setDetectedChannel("whatsapp")}
                    className={`flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition-all ${
                      detectedChannel === "whatsapp"
                        ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </>
              )}
            </div>
            <Button
              size="sm"
              className="h-9 px-5 rounded-full bg-primary hover:bg-primary/90 gap-1.5"
              disabled={!prompt.trim()}
              onClick={() => handleSubmit()}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {currentSuggestions.map((label) => (
            <button
              key={label}
              onClick={() => {
                setPrompt(label);
                handlePromptChange(label);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <SuggestionIcon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <button
            onClick={refreshSuggestions}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
