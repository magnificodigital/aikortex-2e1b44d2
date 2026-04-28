import { Brain, Loader2, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentMemory } from "@/hooks/use-agent-memory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AgentMemoryTabProps {
  agentId: string | undefined;
}

const AgentMemoryTab = ({ agentId }: AgentMemoryTabProps) => {
  const {
    memoryStore,
    isActive,
    isLoading,
    isActivating,
    isDeactivating,
    activateMemory,
    deactivateMemory,
  } = useAgentMemory(agentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-base">Memória Persistente</CardTitle>
            <CardDescription className="text-xs max-w-sm mx-auto">
              Permite que seu agente lembre informações entre conversas diferentes — dados de clientes,
              preferências, histórico de negociações e dados coletados ao longo do tempo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Lembra preferências do cliente entre sessões
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Acumula contexto de negociações anteriores
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Melhora respostas com base no histórico
              </div>
            </div>
            <Button
              onClick={activateMemory}
              disabled={isActivating}
              className="gap-2"
            >
              {isActivating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              {isActivating ? "Ativando..." : "Ativar memória"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Funcionalidade em research preview — pode apresentar instabilidades
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold">Memória Persistente</h3>
          <Badge variant="default" className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
            Ativa
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Memory Store ID</span>
            <code className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
              {memoryStore?.anthropic_memory_store_id
                ? `${memoryStore.anthropic_memory_store_id.slice(0, 20)}...`
                : "—"}
            </code>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Nome</span>
            <span className="font-medium">{memoryStore?.name || "Memória principal"}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Status</span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sincronizado
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-3">
            O agente salvará automaticamente informações relevantes das conversas
            (preferências, dados de clientes, contexto de negociações) e as
            utilizará em conversas futuras para melhores respostas.
          </p>
          <p className="text-[10px] text-amber-600">
            ⚠️ Funcionalidade em research preview — pode apresentar instabilidades
          </p>
        </CardContent>
      </Card>

      <div className="pt-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-destructive hover:text-destructive"
              disabled={isDeactivating}
            >
              {isDeactivating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PowerOff className="w-3.5 h-3.5" />
              )}
              Desativar memória
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar memória?</AlertDialogTitle>
              <AlertDialogDescription>
                As memórias armazenadas serão desvinculadas do agente.
                Novas conversas não terão acesso ao histórico de memória.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deactivateMemory}>
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AgentMemoryTab;
