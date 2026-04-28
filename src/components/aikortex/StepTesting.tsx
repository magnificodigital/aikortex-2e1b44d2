import { useState, useRef, useEffect } from "react";
import { BusinessContext, AgentRecommendation, DeployChannel, CRMProvider } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, CheckCircle2, Rocket, User, Loader2 } from "lucide-react";
import { useAgentChat } from "@/hooks/use-agent-chat";

interface Props {
  context: BusinessContext;
  agents: AgentRecommendation[];
  channels: DeployChannel[];
  crm: CRMProvider | null;
}

function buildSystemPrompt(context: BusinessContext, agents: AgentRecommendation[], channels: DeployChannel[], crm: CRMProvider | null): string {
  const selectedAgents = agents.filter(a => a.selected);
  const agentType = selectedAgents[0]?.type || "Assistente";
  const agentName = context.agentName || selectedAgents[0]?.name || "Assistente IA";
  const objectives = selectedAgents.map(a => a.objective).join("; ");

  return `Você é "${agentName}", um agente de IA do tipo ${agentType} da empresa "${context.companyName}".

## Sobre a empresa
- Setor: ${context.industry || "Não especificado"}
- Produto/Serviço principal: ${context.mainProduct || "Não especificado"}
- Website: ${context.website || "Não informado"}
- País: ${context.country}, Idioma: ${context.language}
${context.services.length > 0 ? `- Serviços: ${context.services.join(", ")}` : ""}

## Seu objetivo
${objectives || "Atender clientes de forma profissional e eficiente."}

## Público-alvo
${context.targetAudienceDescription || "Clientes e leads interessados nos serviços da empresa."}
${context.painPoints ? `- Dores do público: ${context.painPoints}` : ""}

## Tom e comportamento
- Tom de voz: ${context.toneOfVoice || "Profissional e amigável"}
- Mensagem de saudação: ${context.greetingMessage || `Olá! Sou o ${agentName} da ${context.companyName}. Como posso ajudar?`}
${context.skills.length > 0 ? `- Habilidades: ${context.skills.join(", ")}` : ""}

## Canais ativos
${channels.length > 0 ? channels.join(", ") : "Nenhum canal configurado"}

## CRM integrado
${crm || "Nenhum"}

## Regras operacionais
- Horário de atendimento: ${context.businessHours || "24/7"}
${context.escalationRules ? `- Regras de escalonamento: ${context.escalationRules}` : ""}
${context.averageTicket ? `- Ticket médio: ${context.averageTicket}` : ""}

## Instruções
- Responda SEMPRE em ${context.language || "Português"}.
- Mantenha as respostas curtas e diretas (máximo 3 parágrafos).
- Aja de acordo com seu tipo (${agentType}) e objetivo.
- Use o conhecimento da empresa para responder. Se não souber, informe educadamente.
- Não invente informações sobre produtos ou preços que não foram configurados.`;
}

const StepTesting = ({ context, agents, channels, crm }: Props) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedAgents = agents.filter((a) => a.selected);
  const agentName = context.agentName || selectedAgents[0]?.name || "Agente IA";

  const systemPrompt = buildSystemPrompt(context, agents, channels, crm);

  // Use Lovable AI gateway (no user API key needed) for wizard testing
  const { messages, sendMessage, isStreaming } = useAgentChat(
    [{ role: "agent", text: context.greetingMessage || `Olá! Sou o ${agentName} da ${context.companyName}. Como posso ajudar?` }],
    {
      systemPrompt,
      // No useGateway, no provider/model = falls back to Lovable AI gateway with default model
    }
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Seus agentes estão prontos!</h2>
        <p className="text-sm text-muted-foreground">Teste seu agente abaixo antes de colocá-lo em produção</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agentes criados</h4>
          <div className="flex flex-wrap gap-1.5">
            {selectedAgents.map((a) => <Badge key={a.id} variant="secondary">{a.type}</Badge>)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canais</h4>
          <div className="flex flex-wrap gap-1.5">
            {channels.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM</h4>
          <p className="text-sm font-medium text-foreground">{crm || "Nenhum"}</p>
        </div>
      </div>

      {/* Chat testing */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{agentName}</p>
            <p className="text-[10px] text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="p-4 space-y-3 min-h-[250px] max-h-[350px] overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role !== "user" && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
              <div className={`rounded-lg px-3 py-2 text-xs max-w-[75%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-muted/50 text-foreground rounded-tl-none"
              }`}>
                {msg.text || (isStreaming && i === messages.length - 1 ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : "")}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Digite uma mensagem..."
            className="text-xs"
            disabled={isStreaming}
          />
          <Button size="sm" onClick={handleSend} disabled={!input.trim() || isStreaming}>
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <Button size="lg" className="gap-2">
          <Rocket className="w-4 h-4" /> Ativar agentes em produção
        </Button>
      </div>
    </div>
  );
};

export default StepTesting;
