import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings, Loader2, Database, FileText, Globe, Type, HelpCircle } from "lucide-react";
import { useKnowledgeDocuments, useUpdateKb, type AgentKnowledgeBase } from "@/hooks/use-agent-knowledge-bases";
import DocumentListItem from "./DocumentListItem";
import AddDocumentDialog from "./AddDocumentDialog";
import KbSettingsDialog from "./KbSettingsDialog";

interface Props {
  kb: AgentKnowledgeBase;
  agentId: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

export default function KnowledgeBaseCard({ kb, agentId }: Props) {
  const { data: docs = [], isLoading } = useKnowledgeDocuments(kb.id);
  const updateKb = useUpdateKb();
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"text" | "faq" | "file" | "url">("text");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totalChunks = docs.reduce((sum, d) => sum + (d.chunks_count ?? 0), 0);

  function openAdd(tab: typeof initialTab) {
    setInitialTab(tab);
    setAddDocOpen(true);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground truncate">{kb.name}</h3>
            {!kb.enabled && <Badge variant="outline" className="text-[10px]">Desabilitada</Badge>}
          </div>
          {kb.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kb.description}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            {docs.length} documento{docs.length !== 1 ? "s" : ""}
            {" · "}
            {totalChunks} chunk{totalChunks !== 1 ? "s" : ""}
            {" · "}
            atualizado {formatRelative(kb.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={kb.enabled}
            onCheckedChange={(v) => updateKb.mutate({ id: kb.id, agent_id: agentId, patch: { enabled: v } })}
            aria-label="Habilitar base"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!isLoading && docs.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhum documento ainda. Adicione o primeiro abaixo.
          </div>
        )}
        {!isLoading && docs.length > 0 && (
          <div className="space-y-2">
            {docs.map((doc) => (
              <DocumentListItem key={doc.id} doc={doc} kbId={kb.id} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => openAdd("file")}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Arquivo
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAdd("url")}>
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            URL
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAdd("text")}>
            <Type className="w-3.5 h-3.5 mr-1.5" />
            Texto
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAdd("faq")}>
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
            FAQ
          </Button>
        </div>
      </div>

      <AddDocumentDialog
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        agentId={agentId}
        kb={kb}
        initialTab={initialTab}
      />
      <KbSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} kb={kb} />
    </div>
  );
}
