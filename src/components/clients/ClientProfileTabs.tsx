import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Client } from "@/types/client";
import ClientTimeline from "./ClientTimeline";
import {
  FolderKanban, CheckSquare, UserPlus, Zap, Bot, MessageSquare,
  Phone, Globe, DollarSign, Clock
} from "lucide-react";

interface ClientProfileTabsProps {
  client: Client;
}

const EmptyTab = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
    <Icon className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-sm">Nenhum {label} encontrado</p>
    <p className="text-xs mt-1">Dados serão exibidos quando conectados ao backend</p>
  </div>
);

const tabConfig = [
  { value: "timeline", label: "Timeline", icon: Clock },
  { value: "projects", label: "Projetos", icon: FolderKanban },
  { value: "tasks", label: "Tarefas", icon: CheckSquare },
  { value: "leads", label: "CRM/Leads", icon: UserPlus },
  { value: "automations", label: "Automações", icon: Zap },
  { value: "agents", label: "Agentes IA", icon: Bot },
  { value: "messages", label: "Mensagens", icon: MessageSquare },
  { value: "voice", label: "Voz", icon: Phone },
  { value: "websites", label: "Sites", icon: Globe },
  { value: "financial", label: "Financeiro", icon: DollarSign },
];

const ClientProfileTabs = ({ client }: ClientProfileTabsProps) => {
  return (
    <Tabs defaultValue="timeline" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 bg-transparent p-0 border-b border-border rounded-none">
        {tabConfig.map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-3 py-2 text-xs gap-1.5"
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="timeline" className="mt-4">
        <ClientTimeline />
      </TabsContent>

      <TabsContent value="projects" className="mt-4">
        <div className="space-y-2">
          {client.projects > 0 ? (
            Array.from({ length: client.projects }).map((_, i) => (
              <div key={i} className="glass-card rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Projeto {i + 1}</p>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 text-xs">
                  Ativo
                </Badge>
              </div>
            ))
          ) : (
            <EmptyTab icon={FolderKanban} label="projeto" />
          )}
        </div>
      </TabsContent>

      <TabsContent value="tasks" className="mt-4">
        {client.tasks > 0 ? (
          <div className="space-y-2">
            {["Configurar chatbot", "Revisar landing page", "Integrar CRM"].slice(0, Math.min(3, client.tasks)).map((task, i) => (
              <div key={i} className="glass-card rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-destructive" : i === 1 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]"}`} />
                  <p className="text-sm text-foreground">{task}</p>
                </div>
                <span className="text-xs text-muted-foreground">{i === 0 ? "Hoje" : i === 1 ? "Amanhã" : "Seg"}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyTab icon={CheckSquare} label="tarefa" />
        )}
      </TabsContent>

      <TabsContent value="leads" className="mt-4">
        {client.leads > 0 ? (
          <div className="glass-card rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{client.leads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{Math.round(client.leads * 0.3)}</p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--warning))]">{Math.round(client.leads * 0.45)}</p>
                <p className="text-xs text-muted-foreground">Em progresso</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyTab icon={UserPlus} label="lead" />
        )}
      </TabsContent>

      {["automations", "agents", "messages", "voice", "websites", "financial"].map(tab => (
        <TabsContent key={tab} value={tab} className="mt-4">
          <EmptyTab
            icon={tabConfig.find(t => t.value === tab)!.icon}
            label={tabConfig.find(t => t.value === tab)!.label.toLowerCase()}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ClientProfileTabs;
