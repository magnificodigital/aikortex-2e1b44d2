import { useState } from "react";
import type { SavedFlow, FlowFolder } from "@/types/flow-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderPlus,
  Folder,
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
  Workflow,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  flows: SavedFlow[];
  folders: FlowFolder[];
  onOpenFlow: (flow: SavedFlow) => void;
  onToggleFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFlow: (flowId: string, folderId: string | null) => void;
}

export default function FlowList({
  flows,
  folders,
  onOpenFlow,
  onToggleFlow,
  onDeleteFlow,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFlow,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderDialog, setFolderDialog] = useState<{ open: boolean; editId?: string; name: string }>({
    open: false,
    name: "",
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveFolder = () => {
    const name = folderDialog.name.trim();
    if (!name) return;
    if (folderDialog.editId) {
      onRenameFolder(folderDialog.editId, name);
      toast.success("Pasta renomeada");
    } else {
      onCreateFolder(name);
      toast.success("Pasta criada");
    }
    setFolderDialog({ open: false, name: "" });
  };

  const rootFlows = flows.filter((f) => !f.folderId);

  const statusBadge = (status: SavedFlow["status"]) => {
    const map = {
      active: { label: "Ativo", cls: "bg-green-500/10 text-green-500 border-green-500/20" },
      paused: { label: "Pausado", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground border-border" },
    };
    const s = map[status];
    return <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", s.cls)}>{s.label}</Badge>;
  };

  const FlowRow = ({ flow }: { flow: SavedFlow }) => (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-card/40 hover:bg-accent/30 transition-all group">
      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Workflow className="w-3.5 h-3.5 text-primary" />
      </div>
      <button onClick={() => onOpenFlow(flow)} className="flex-1 min-w-0 text-left">
        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {flow.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{flow.description}</p>
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        {statusBadge(flow.status)}
        <Switch
          checked={flow.status === "active"}
          onCheckedChange={() => onToggleFlow(flow.id)}
          className="scale-75"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpenFlow(flow)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
            </DropdownMenuItem>
            {folders.map((folder) => (
              <DropdownMenuItem key={folder.id} onClick={() => onMoveFlow(flow.id, folder.id)}>
                <Folder className="w-3.5 h-3.5 mr-2" /> Mover para {folder.name}
              </DropdownMenuItem>
            ))}
            {flow.folderId && (
              <DropdownMenuItem onClick={() => onMoveFlow(flow.id, null)}>
                <FolderOpen className="w-3.5 h-3.5 mr-2" /> Remover da pasta
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={() => onDeleteFlow(flow.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Meus Fluxos</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setFolderDialog({ open: true, name: "" })}
        >
          <FolderPlus className="w-3.5 h-3.5" /> Nova Pasta
        </Button>
      </div>

      {/* Folders */}
      {folders.map((folder) => {
        const folderFlows = flows.filter((f) => f.folderId === folder.id);
        const isOpen = expandedFolders.has(folder.id);
        return (
          <div key={folder.id} className="space-y-1">
            <div className="flex items-center gap-2 group">
              <button
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg hover:bg-accent/30 transition-colors"
              >
                <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                {isOpen ? (
                  <FolderOpen className="w-4 h-4 text-primary" />
                ) : (
                  <Folder className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs font-semibold text-foreground">{folder.name}</span>
                <span className="text-[10px] text-muted-foreground">({folderFlows.length})</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setFolderDialog({ open: true, editId: folder.id, name: folder.name })}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => onDeleteFolder(folder.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isOpen && (
              <div className="pl-6 space-y-1.5">
                {folderFlows.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic px-2 py-2">Pasta vazia</p>
                ) : (
                  folderFlows.map((flow) => <FlowRow key={flow.id} flow={flow} />)
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Root flows */}
      {rootFlows.length > 0 && (
        <div className="space-y-1.5">
          {folders.length > 0 && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Sem pasta</p>
          )}
          {rootFlows.map((flow) => (
            <FlowRow key={flow.id} flow={flow} />
          ))}
        </div>
      )}

      {flows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center text-center space-y-2">
          <Workflow className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Nenhum fluxo criado ainda. Use um template acima ou crie do zero.</p>
        </div>
      )}

      {/* Folder create/edit dialog */}
      <Dialog open={folderDialog.open} onOpenChange={(open) => !open && setFolderDialog({ open: false, name: "" })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{folderDialog.editId ? "Renomear pasta" : "Nova pasta"}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nome da pasta"
            value={folderDialog.name}
            onChange={(e) => setFolderDialog((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSaveFolder()}
            className="h-9 text-sm"
          />
          <DialogFooter>
            <Button size="sm" onClick={handleSaveFolder} disabled={!folderDialog.name.trim()}>
              {folderDialog.editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
