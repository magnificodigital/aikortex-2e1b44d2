import { MessageSquare, Users, Inbox, FolderOpen, Tag, BarChart3, Settings, Hash, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MessagesSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  { id: "all", label: "Todas as Conversas", icon: MessageSquare, count: 24 },
  { id: "mine", label: "Minhas", icon: Inbox, count: 11 },
  { id: "unassigned", label: "Não Atribuídas", icon: Users, count: 6 },
  { id: "unattended", label: "Sem Resposta", icon: Hash, count: 3 },
];

const folders = [
  { id: "priority", label: "Conversas Prioritárias", count: 5 },
  { id: "leads", label: "Leads Inbox", count: 8 },
];

const teams = [
  { id: "sales", label: "Vendas" },
  { id: "support", label: "Suporte L1" },
  { id: "support-l2", label: "Suporte L2" },
];

const labels = [
  { id: "device-setup", label: "device-setup", color: "bg-destructive" },
  { id: "lead", label: "lead", color: "bg-amber-500" },
  { id: "software", label: "software", color: "bg-primary" },
  { id: "bug", label: "bug", color: "bg-red-500" },
];

const MessagesSidebar = ({ activeSection, onSectionChange }: MessagesSidebarProps) => {
  return (
    <div className="w-[220px] min-w-[200px] border-r border-border bg-card flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-semibold text-foreground">Aikortex</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
        </div>
      </div>

      {/* Conversations Section */}
      <div className="px-2 py-2">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conversas</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                activeSection === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <Badge variant="secondary" className="h-4 min-w-[18px] px-1 text-[10px] rounded-full">
                  {item.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="px-2 py-2 border-t border-border">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pastas</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onSectionChange(folder.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                activeSection === folder.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <span className="truncate flex-1 text-left">{folder.label}</span>
              <Badge variant="secondary" className="h-4 min-w-[18px] px-1 text-[10px] rounded-full">
                {folder.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div className="px-2 py-2 border-t border-border">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Equipes</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => onSectionChange(team.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                activeSection === team.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <span className="truncate flex-1 text-left">{team.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="px-2 py-2 border-t border-border">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() => onSectionChange(label.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                activeSection === label.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", label.color)} />
              <span className="truncate flex-1 text-left">{label.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="mt-auto px-2 py-2 border-t border-border space-y-0.5">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-accent/50 transition-colors">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Relatórios</span>
        </button>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-accent/50 transition-colors">
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </button>
      </div>
    </div>
  );
};

export default MessagesSidebar;
