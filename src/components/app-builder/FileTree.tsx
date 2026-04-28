import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppBuilder, GeneratedFile } from "@/contexts/AppBuilderContext";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

/** Build a tree from flat file list */
function buildTree(files: GeneratedFile[]): FileNode[] {
  const root: Record<string, any> = {};

  files.forEach((f) => {
    const parts = f.path.replace(/^\//, "").split("/");
    let current = root;
    parts.forEach((part, i) => {
      if (!current[part]) {
        current[part] = i === parts.length - 1 ? { __file: true } : {};
      }
      current = current[part];
    });
  });

  function toNodes(obj: Record<string, any>): FileNode[] {
    return Object.entries(obj)
      .filter(([k]) => k !== "__file")
      .map(([name, val]) => {
        if (val.__file) return { name, type: "file" as const };
        const children = toNodes(val);
        return { name, type: "folder" as const, children };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toNodes(root);
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (name: string) => void;
}

const FileTreeItem = ({ node, depth, selectedFile, onSelect }: FileTreeItemProps) => {
  const [open, setOpen] = useState(depth === 0);
  const isFolder = node.type === "folder";
  const isSelected = selectedFile === node.name;

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) setOpen(!open);
          else onSelect(node.name);
        }}
        className={cn(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs hover:bg-accent/50 rounded transition-colors",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isFolder ? (
          <>
            {open ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            {open ? <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" /> : <Folder className="w-3.5 h-3.5 text-primary shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeItem key={child.name} node={child} depth={depth + 1} selectedFile={selectedFile} onSelect={onSelect} />
      ))}
    </div>
  );
};

interface FileTreeProps {
  selectedFile: string | null;
  onSelectFile: (name: string) => void;
  channel?: "whatsapp" | "web";
}

const FileTree = ({ selectedFile, onSelectFile, channel }: FileTreeProps) => {
  const { files } = useAppBuilder();

  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="w-[220px] min-w-[180px] border-r border-border bg-card/50 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
        {channel === "whatsapp"
          ? "Envie uma mensagem no Studio para gerar os fluxos e handlers do bot"
          : "Envie uma mensagem no Studio para gerar as páginas e componentes do app"}
      </div>
    );
  }

  return (
    <div className="w-[220px] min-w-[180px] border-r border-border bg-card/50 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <File className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground ml-auto">{files.length} arquivos</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => (
          <FileTreeItem key={node.name} node={node} depth={0} selectedFile={selectedFile} onSelect={onSelectFile} />
        ))}
      </div>
    </div>
  );
};

export default FileTree;
