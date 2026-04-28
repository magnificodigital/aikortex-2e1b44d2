import { Terminal as TerminalIcon, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAppBuilder } from "@/contexts/AppBuilderContext";

const TerminalPanel = () => {
  const [expanded, setExpanded] = useState(false);
  const { terminalLogs } = useAppBuilder();

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-4 py-1.5 border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors bg-card/30"
      >
        <TerminalIcon className="w-3.5 h-3.5" />
        <span>Terminal</span>
        {terminalLogs.length > 0 && (
          <span className="text-[10px] text-muted-foreground/60">({terminalLogs.length})</span>
        )}
        <ChevronUp className="w-3 h-3 ml-1" />
      </button>
    );
  }

  return (
    <div className="border-t border-border bg-background">
      <button
        onClick={() => setExpanded(false)}
        className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <TerminalIcon className="w-3.5 h-3.5" />
        <span>Terminal</span>
        <ChevronDown className="w-3 h-3 ml-1" />
      </button>
      <div className="h-32 overflow-auto px-4 py-2 font-mono text-xs space-y-0.5">
        {terminalLogs.length === 0 ? (
          <div className="text-muted-foreground">Aguardando...</div>
        ) : (
          terminalLogs.map((log, i) => (
            <div key={i} className={
              log.type === "command" ? "text-foreground" :
              log.type === "success" ? "text-green-500" :
              log.type === "error" ? "text-destructive" :
              "text-muted-foreground"
            }>
              {log.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TerminalPanel;
