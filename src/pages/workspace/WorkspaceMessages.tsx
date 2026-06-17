import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";

interface Props {
  clientId?: string;
}

const WorkspaceMessages = ({ clientId }: Props) => {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["workspace-conversations", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, contact_name, contact_phone, channel, status, last_message_at, last_message_preview")
        .eq("client_id", clientId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-4">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Mensagens</h1>
          <p className="text-sm text-muted-foreground">Conversas dos seus agentes de IA com leads e clientes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Nenhuma conversa ainda</p>
            <p className="text-xs text-muted-foreground">
              Assim que um lead falar com seu agente de IA, a conversa aparece aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any) => (
            <Card key={c.id} className="hover:bg-muted/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.contact_name || c.contact_phone || "Contato"}</p>
                    {c.channel && <Badge variant="outline" className="text-[10px]">{c.channel}</Badge>}
                    {c.status && <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>}
                  </div>
                  {c.last_message_preview && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.last_message_preview}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0 ml-3">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceMessages;
