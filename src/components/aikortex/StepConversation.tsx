import { ConversationStep } from "@/types/agent-builder";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, RefreshCw, Bot, User } from "lucide-react";

interface Props {
  steps: ConversationStep[];
  onRegenerate: () => void;
  onNext: () => void;
}

const StepConversation = ({ steps, onRegenerate, onNext }: Props) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <MessageSquare className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Script de conversa gerado</h2>
        <p className="text-sm text-muted-foreground">O fluxo de conversa do seu agente foi criado automaticamente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flow steps */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapas do fluxo</h3>
          {steps.map((step, i) => (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat simulation */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Preview da conversa</span>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {steps.map((step, i) => (
              <div key={step.id}>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-muted/50 rounded-lg rounded-tl-none px-3 py-2 text-xs text-foreground max-w-[85%]">
                    {step.content}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex gap-2 items-start justify-end mt-2">
                    <div className="bg-primary/10 rounded-lg rounded-tr-none px-3 py-2 text-xs text-primary max-w-[70%]">
                      [Resposta do cliente]
                    </div>
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onRegenerate} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Regerar script
        </Button>
        <Button onClick={onNext} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default StepConversation;
