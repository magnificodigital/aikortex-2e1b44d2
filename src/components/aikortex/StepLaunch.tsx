import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessContext, AgentRecommendation, DeployChannel, DEPLOY_CHANNELS, CRMProvider, CRM_PROVIDERS } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Rocket, User, Check, ArrowLeft } from "lucide-react";

interface Props {
  context: BusinessContext;
  agent: AgentRecommendation | null;
  selectedChannels: DeployChannel[];
  onToggleChannel: (ch: DeployChannel) => void;
  selectedCRM: CRMProvider | null;
  onSelectCRM: (crm: CRMProvider | null) => void;
  onBack: () => void;
}

const MOCK_RESPONSES: Record<string, string> = {
  default: "Olá! Como posso ajudar você hoje?",
  oi: "Olá! Que bom te ver por aqui. Como posso ajudar?",
  preço: "Nossos planos são flexíveis. Posso agendar uma conversa com nosso especialista?",
  funciona: "Nosso sistema é super intuitivo! Quer que eu te mostre como?",
};

const StepLaunch = ({ context, agent, selectedChannels, onToggleChannel, selectedCRM, onSelectCRM, onBack }: Props) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: `Olá! Sou o assistente da ${context.companyName || "sua empresa"}. Como posso ajudar?` },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setTimeout(() => {
      const key = Object.keys(MOCK_RESPONSES).find((k) => userMsg.toLowerCase().includes(k));
      setMessages((prev) => [...prev, { role: "agent", text: MOCK_RESPONSES[key || "default"] }]);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Seu agente está pronto!</h2>
        <p className="text-sm text-muted-foreground">Teste, escolha os canais e ative</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Chat test */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{agent?.name || "Agente IA"}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" /> Online
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 min-h-[220px] max-h-[300px] overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "agent" && (
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-2.5 h-2.5 text-primary" />
                  </div>
                )}
                <div className={`rounded-lg px-3 py-2 text-xs max-w-[80%] ${
                  msg.role === "agent"
                    ? "bg-muted/50 text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-3 py-2.5 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Teste seu agente..."
              className="text-xs h-8"
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim()} className="h-8 w-8 p-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          {/* Connected channels */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Canais conectados</h3>
            <div className="flex flex-wrap gap-2">
              {selectedChannels.length > 0 ? (
                DEPLOY_CHANNELS.filter(ch => selectedChannels.includes(ch.value)).map((ch) => (
                  <Badge key={ch.value} variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
                    <span>{ch.icon}</span> {ch.label}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum canal selecionado</p>
              )}
            </div>
          </div>

          {/* CRM */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">CRM <span className="text-muted-foreground font-normal">(opcional)</span></h3>
            <div className="flex flex-wrap gap-2">
              {CRM_PROVIDERS.map((crm) => (
                <button
                  key={crm.value}
                  onClick={() => onSelectCRM(selectedCRM === crm.value ? null : crm.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedCRM === crm.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {crm.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button size="lg" className="gap-2 px-8" onClick={() => navigate(`/aikortex/agents/${agent?.id || "sdr-1"}`)}>
          <Rocket className="w-4 h-4" /> Ativar agente em produção
        </Button>
      </div>
    </div>
  );
};

export default StepLaunch;
