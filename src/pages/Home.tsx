import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_PRESETS } from "@/types/agent-presets";
import type { AgentType } from "@/types/agent-builder";
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

const APP_NOUNS = ["app", "aplicativo", "aplicacao", "aplicação", "site", "website", "dashboard", "painel", "portal", "landing", "sistema", "plataforma", "formulario", "formulário", "crm", "loja", "blog"];
// Regex amplo: pega cri/cria/criar/crie, faz/faça/fazer, monta/monte/montar, etc.
// Inclui "preciso de", "quero", "bora", "vamos", "podemos" — gatilhos comuns em PT-BR falado.
const CREATION_VERB_RE = /\b(cri[ae][r]?|construa|construir|constroi|constr[óo]i|monte|montar|monto|ger[ae][r]?|fa[çc][aoe][rm]?|fa[zc]|abr[ae]?|abrir|quero|queria|preciso|precisamos|pode[mr]?|podemos|bora|vamos|me\s+ajuda)\b/i;

function detectCategory(text: string): "app" | "agentes" {
  const lower = text.toLowerCase();
  if (AGENT_KEYWORDS.some((k) => lower.includes(k))) return "agentes";
  return "app";
}

const QUESTION_RE = /\b(como|por\s*qu[eê]|porqu[eê]|onde|quando|qual|quais|quem|o\s*que|que\s+(eh|é))\b/i;

function looksLikeCreationIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.length < 4) return false;
  // Pergunta nao eh criacao (ex.: "como funciona um agente?")
  if (/[?]/.test(lower) || QUESTION_RE.test(lower)) return false;
  // Basta mencionar um substantivo de produto. Em PT-BR falado o verbo cai
  // em muitos casos ("agente SDR pra WhatsApp", "um app pra estoque").
  const hasAgentNoun = AGENT_KEYWORDS.some((k) => lower.includes(k));
  const hasAppNoun = APP_NOUNS.some((k) => lower.includes(k));
  return hasAgentNoun || hasAppNoun;
}

function detectAgentType(text: string): { id: string; type: AgentType; name: string } | null {
  const lower = text.toLowerCase();
  if (lower.includes("sdr") || lower.includes("qualificação") || lower.includes("qualificacao") || lower.includes("qualificador"))
    return { id: "sdr-1", type: "SDR", name: "Agente SDR" };
  if (lower.includes("sac") || lower.includes("suporte") || lower.includes("atendimento") || lower.includes("customer success") || lower.includes("cs "))
    return { id: "sac-1", type: "SAC", name: "Agente SAC" };
  return null;
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


  const handleTextSubmit = (text: string) => {
    const detected = detectCategory(text);
    if (detected === "agentes") {
      const agentInfo = detectAgentType(text);
      if (agentInfo) {
        const preset = AGENT_PRESETS[agentInfo.type];
        const storagePrefix = `agent-detail-${agentInfo.id}`;
        try {
          ["name", "desc", "objective", "instructions", "toneOfVoice", "greetingMessage"].forEach((k) =>
            localStorage.removeItem(`${storagePrefix}-${k}`),
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
        navigate(`/aikortex/agents/new`, {
          state: { fromTemplate: false, initialPrompt: text, agentType: "Custom" },
        });
      }
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
      // Voz SEMPRE vai pro fluxo custom (/new), nao pro template SDR/SAC.
      // Por que? O wizard so dispara handleDiscover(initialPrompt) quando
      // fromTemplate=false. Se eu mandasse pro template, o agente abria
      // pre-configurado mas o wizard nao continuaria com a fala do user.
      // No /new o wizard roda com a frase inteira como prompt inicial.
      navigate(`/aikortex/agents/new`, {
        state: { fromTemplate: false, initialPrompt: text, agentType: "Custom" },
      });
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
