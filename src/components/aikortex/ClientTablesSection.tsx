import { useEffect, useState } from "react";
import { Database, Plus, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveClient } from "@/hooks/use-active-client";
import { useClientTables, type ClientTable } from "@/hooks/use-client-tables";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import ClientTableCard from "./ClientTableCard";
import CreateClientTableDialog from "./CreateClientTableDialog";
import ClientTableEditor from "./ClientTableEditor";

interface Props {
  agentId?: string;
  isFreshNew?: boolean;
}

export default function ClientTablesSection({ agentId, isFreshNew }: Props) {
  const { activeClientId, activeClientName, isAgencyMode } = useActiveClient();
  const { sandboxClient } = useWorkspace();
  // Resolve clientId baseado no AGENTE: se agente tem client_id (vinculado a
  // cliente real), usa ele. Se null (modo personalizado), usa Sandbox. Assim
  // a aba Tabelas no painel do agente mostra as tabelas certas sem depender
  // do workspace switch. Antes, em modo agência o painel pedia "Selecione
  // um cliente" mesmo o agente tendo tabelas no Sandbox.
  const [agentClientId, setAgentClientId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!agentId) { setAgentClientId(null); return; }
    (async () => {
      const { data } = await supabase
        .from("user_agents")
        .select("client_id")
        .eq("id", agentId)
        .maybeSingle();
      if (cancelled) return;
      setAgentClientId((data as { client_id?: string | null } | null)?.client_id ?? null);
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  // Em modo agência, prefere o client_id do AGENTE sobre o workspace.
  // Em modo workspace de cliente, mantém a seleção do workspace (caso usuário
  // tenha trocado manualmente).
  const effectiveClientId = isAgencyMode
    ? (agentClientId ?? sandboxClient?.id ?? null)
    : activeClientId;
  const effectiveClientName = isAgencyMode
    ? (agentClientId ? "Cliente vinculado" : (sandboxClient ? "Sandbox / Testes" : ""))
    : activeClientName;
  const { data: tables = [], isLoading } = useClientTables(effectiveClientId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ClientTable | null>(null);

  // Keep editingTable in sync with latest table data (e.g. after rename)
  const liveEditing = editingTable ? tables.find((t) => t.id === editingTable.id) ?? null : null;
  if (liveEditing) {
    return <ClientTableEditor table={liveEditing} onBack={() => setEditingTable(null)} />;
  }

  if (isFreshNew) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Tabelas do cliente
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Salve este agente primeiro para conectar tabelas de dados do cliente.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Disponível após salvar o agente.</p>
        </div>
      </div>
    );
  }

  // Só mostra empty state se não tiver effectiveClientId (sem agente E sem
  // workspace ativo). Quando agentId é passado, effectiveClientId resolve
  // pra client_id do agente ou Sandbox automaticamente.
  if (!effectiveClientId) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Tabelas do cliente
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tabelas pertencem ao cliente e são compartilhadas entre todos os agentes desse cliente.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Users className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-foreground font-medium">Selecione um cliente</p>
          <p className="text-xs text-muted-foreground">
            Entre no workspace de um cliente pelo seletor superior para ver e criar tabelas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Tabelas do cliente
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dados estruturados de <span className="font-medium text-foreground">{effectiveClientName}</span>{isAgencyMode && agentClientId == null && sandboxClient ? " (modo personalizado — tabelas de teste no Sandbox)" : ""}, compartilhados entre todos os agentes deste cliente.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {!isLoading && tables.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Database className="w-8 h-8 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm font-medium text-foreground">Nenhuma tabela ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie sua primeira tabela para que os agentes deste cliente possam consultar dados estruturados.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Criar primeira tabela
          </Button>
        </div>
      )}

      {!isLoading && tables.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {tables.length} tabela{tables.length === 1 ? "" : "s"}
            </p>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Nova tabela
            </Button>
          </div>
          <div className="space-y-2">
            {tables.map((t) => (
              <ClientTableCard key={t.id} table={t} onOpenEditor={setEditingTable} />
            ))}
          </div>
        </>
      )}

      <CreateClientTableDialog open={createOpen} onOpenChange={setCreateOpen} clientId={effectiveClientId} />
    </div>
  );
}
