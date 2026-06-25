import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SparkInterface } from "@/components/spark/SparkInterface";

const WHATSAPP_KEYWORDS = ["whatsapp", "wpp", "zap", "zapzap", "mensagem", "conversa", "chat", "atendimento", "sac", "suporte ao cliente", "cliente pelo whatsapp", "whats"];
const WEB_KEYWORDS = ["web", "site", "website", "dashboard", "portal", "painel", "landing", "página", "pagina", "sistema web", "plataforma", "saas", "aplicativo web", "app web"];

type AppChannel = "whatsapp" | "web" | null;

function detectChannel(text: string): AppChannel {
  const lower = text.toLowerCase();
  const hasWa = WHATSAPP_KEYWORDS.some((k) => lower.includes(k));
  const hasWeb = WEB_KEYWORDS.some((k) => lower.includes(k));
  if (hasWa && !hasWeb) return "whatsapp";
  if (hasWeb && !hasWa) return "web";
  if (hasWa && hasWeb) return "whatsapp";
  return null;
}

const AGENT_KEYWORDS = ["agente", "agent", "sdr", "bdr", "sac", "suporte", "atendimento", "qualificação", "qualificacao", "qualificador", "prospecção", "prospeccao", "captura de lead", "captação", "captacao", "cobranças", "cobranca", "onboarding", "customer success", "cs ", "assistente", "diagnóstico", "diagnostico", "agendador", "agendamento", "chatbot", "bot", "vendas", "vender", "retenção", "retencao", "pós-venda", "pos-venda"];

function detectCategory(text: string): "app" | "agentes" {
  const lower = text.toLowerCase();
  if (AGENT_KEYWORDS.some((k) => lower.includes(k))) return "agentes";
  return "app";
}

const Home = () => {
  const [userName, setUserName] = useState("Usuário");
  const { user } = useAuth();
  const navigate = useNavigate();

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
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const detectHonorific = (fullName: string): "Sr" | "Sra" => {
    const first = (fullName || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    if (!first) return "Sr";
    const maleEndingInA = new Set([
      "luca", "costa", "iuda", "barnaba", "elias", "tobias", "matias",
      "joshua", "akira", "yoshua",
    ]);
    const femaleNotEndingInA = new Set([
      "beatriz", "ines", "inês", "isis", "íris", "iris", "carmen", "miriam",
      "raquel", "isabel", "soledad", "esther", "ester", "abigail", "rute",
      "ruth", "judite", "estér",
    ]);
    if (femaleNotEndingInA.has(first)) return "Sra";
    if (maleEndingInA.has(first)) return "Sr";
    return first.endsWith("a") ? "Sra" : "Sr";
  };


  // Fluxo unificado: identico ao botao "Novo Agente" em /aikortex/agents,
  // so adiciona initialPrompt pro wizard ja kickar com a fala/texto do user.
  // Sem deteccao de template SDR/SAC — wizard decide tudo a partir do prompt.
  const navigateToNewAgent = (text: string) => {
    const newId = `new-${Date.now()}`;
    navigate(`/aikortex/agents/${newId}`, {
      state: {
        fromTemplate: false,
        agentType: "Custom",
        agentName: "Novo Agente",
        initialPrompt: text,
      },
    });
  };

  const handleTextSubmit = (text: string) => {
    const detected = detectCategory(text);
    if (detected === "agentes") {
      navigateToNewAgent(text);
    } else {
      const channel = detectChannel(text) ?? "web";
      navigate("/app-builder", { state: { initialPrompt: text, channel } });
    }
  };

  const handleVoiceTranscript = (text: string) => {
    // Backend (spark-voice) ja filtrou: so chega aqui se intent=creation.
    console.log(`[spark→home] navegando com transcript="${text}"`);
    const detected = detectCategory(text);
    if (detected === "agentes") {
      navigateToNewAgent(text);
    } else {
      const channel = detectChannel(text) ?? "web";
      navigate("/app-builder", { state: { initialPrompt: text, channel } });
    }
  };

  return (
    <DashboardLayout>
      <SparkInterface
        greeting={getGreeting()}
        userName={userName}
        honorific={detectHonorific(userName)}
        onTextSubmit={handleTextSubmit}
        onVoiceTranscript={handleVoiceTranscript}
      />
    </DashboardLayout>
  );
};

export default Home;
