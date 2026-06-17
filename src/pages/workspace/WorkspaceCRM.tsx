import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Contact, Loader2, Phone, Mail } from "lucide-react";

interface Props {
  clientId?: string;
}

const TEMP_BADGE: Record<string, string> = {
  hot: "bg-red-500/10 text-red-600",
  warm: "bg-amber-500/10 text-amber-600",
  cold: "bg-blue-500/10 text-blue-600",
};

const WorkspaceCRM = ({ clientId }: Props) => {
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["workspace-crm-contacts", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, name, email, phone, company, stage_slug, temperature, created_at")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-4">
      <div className="flex items-center gap-3">
        <Contact className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-sm text-muted-foreground">Contatos e leads atribuídos a você</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-2">
            <Contact className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Nenhum contato ainda</p>
            <p className="text-xs text-muted-foreground">
              Quando um agente qualificar um lead, ele aparece aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Temperatura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.company || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground space-y-1">
                      {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</div>}
                      {!c.email && !c.phone && "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.stage_slug}</Badge></TableCell>
                    <TableCell>
                      {c.temperature ? (
                        <Badge className={`${TEMP_BADGE[c.temperature] || "bg-muted"} border-0 text-[10px]`}>{c.temperature}</Badge>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkspaceCRM;
