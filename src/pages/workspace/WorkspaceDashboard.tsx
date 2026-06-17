import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, MessageSquare, Contact } from "lucide-react";

interface Props {
  clientId?: string;
  clientName?: string | null;
}

const WorkspaceDashboard = ({ clientId, clientName }: Props) => {
  const { data: stats } = useQuery({
    queryKey: ["workspace-dashboard-stats", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [agentsRes, conversationsRes, contactsRes] = await Promise.all([
        supabase.from("user_agents").select("id", { count: "exact", head: true }).eq("client_id", clientId!),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("client_id", clientId!),
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId!),
      ]);
      return {
        agents: agentsRes.count ?? 0,
        conversations: conversationsRes.count ?? 0,
        contacts: contactsRes.count ?? 0,
      };
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá{clientName ? `, ${clientName.split(" ")[0]}` : ""}!</h1>
        <p className="text-sm text-muted-foreground">Este é o seu workspace. Aqui você acompanha seus agentes de IA e contatos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Agentes ativos</p>
              <p className="text-2xl font-bold">{stats?.agents ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversas</p>
              <p className="text-2xl font-bold">{stats?.conversations ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Contact className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contatos no CRM</p>
              <p className="text-2xl font-bold">{stats?.contacts ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm font-medium">Mais em breve</p>
          <p className="text-xs text-muted-foreground">
            Estamos preparando módulos de Vendas, Financeiro, Propostas e Tarefas pro seu workspace.
            Sua agência libera o que estiver disponível pra você usar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceDashboard;
