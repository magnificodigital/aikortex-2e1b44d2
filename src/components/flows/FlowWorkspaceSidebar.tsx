import { useState } from "react";
import {
  Table2,
  FileText,
  BookOpen,
  CalendarClock,
  ScrollText,
  Search,
  Plus,
  ChevronDown,
  Settings,
  HelpCircle,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedFlow } from "@/types/flow-builder";

const WORKSPACE_ITEMS = [
  { icon: Table2, label: "Tables", id: "tables" },
  { icon: FileText, label: "Files", id: "files" },
  { icon: BookOpen, label: "Knowledge Base", id: "knowledge" },
  { icon: CalendarClock, label: "Scheduled Tasks", id: "scheduled" },
  { icon: ScrollText, label: "Logs", id: "logs" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  draft: "bg-muted-foreground/40",
};

interface Props {
  flows: SavedFlow[];
  activeFlowId?: string;
  onOpenFlow: (flow: SavedFlow) => void;
  onNewFlow: () => void;
}

export default function FlowWorkspaceSidebar({ flows, activeFlowId, onOpenFlow, onNewFlow }: Props) {
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [workflowsOpen, setWorkflowsOpen] = useState(true);

  return (
    <div className="w-[220px] border-r border-border bg-card/50 flex flex-col h-full flex-shrink-0">
      {/* Workspace selector */}
      <div className="px-3 pt-3 pb-2">
        <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-accent/40 transition-colors">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <Workflow className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground flex-1 text-left truncate">Aikortex</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-muted-foreground">
          <Search className="w-3 h-3" />
          <span className="text-[11px]">Search</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {/* Workspace section */}
        <div>
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="flex items-center gap-1 px-2 py-1 w-full text-left"
          >
            <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", !workspaceOpen && "-rotate-90")} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workspace</span>
          </button>
          {workspaceOpen && (
            <div className="space-y-0.5 mt-0.5">
              {WORKSPACE_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Workflows section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <button
              onClick={() => setWorkflowsOpen(!workflowsOpen)}
              className="flex items-center gap-1"
            >
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", !workflowsOpen && "-rotate-90")} />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workflows</span>
            </button>
            <button
              onClick={onNewFlow}
              className="p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Novo workflow"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {workflowsOpen && (
            <div className="space-y-0.5 mt-0.5">
              {flows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => onOpenFlow(flow)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg transition-colors text-left group",
                    activeFlowId === flow.id
                      ? "bg-accent/60 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[flow.status] || STATUS_COLORS.draft)} />
                  <span className="text-[11px] font-medium truncate">{flow.name}</span>
                </button>
              ))}
              {flows.length === 0 && (
                <p className="text-[10px] text-muted-foreground/60 px-2.5 py-1 italic">Nenhum workflow</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border px-2 py-2 space-y-0.5">
        <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Help</span>
        </button>
        <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors">
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
