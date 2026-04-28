import { useLocation, useNavigate } from "react-router-dom";
import { AgentBuilderProvider } from "@/contexts/AgentBuilderContext";
import AgentBuilderStudio from "@/components/agent-builder/AgentBuilderStudio";
import AgentPreview from "@/components/agent-builder/AgentPreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import type { AgentType } from "@/types/agent-builder";

const AgentBuilderInner = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/aikortex/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Bot className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold">Agent Builder</h1>
      </div>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — wizard */}
        <div className="flex-1 min-w-0 border-r border-border overflow-hidden">
          <AgentBuilderStudio />
        </div>
        {/* Right — preview */}
        <div className="w-[380px] shrink-0 p-4 overflow-y-auto hidden md:block">
          <AgentPreview />
        </div>
      </div>
    </div>
  );
};

const AgentBuilder = () => {
  const location = useLocation();
  const state = location.state as { agentType?: AgentType } | null;
  const initialType: AgentType = state?.agentType || "Custom";

  return (
    <AgentBuilderProvider initialType={initialType}>
      <AgentBuilderInner />
    </AgentBuilderProvider>
  );
};

export default AgentBuilder;
