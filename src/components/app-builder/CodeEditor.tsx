import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppBuilder } from "@/contexts/AppBuilderContext";

interface CodeEditorProps {
  fileName: string | null;
  channel?: "whatsapp" | "web";
}

const syntaxHighlight = (line: string) => {
  return line
    .replace(/(import|from|export|default|function|return|const|let|var|if|else|switch|case|break|new|this|await|async|class|private|interface|type)/g, '<span class="text-purple-400">$1</span>')
    .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-green-400">$1</span>')
    .replace(/(\/\/.*)/g, '<span class="text-muted-foreground">$1</span>');
};

const CodeEditor = ({ fileName }: CodeEditorProps) => {
  const { files } = useAppBuilder();

  const file = files.find((f) => f.name === fileName);
  const lines = file ? file.content.split("\n") : [];

  if (!fileName) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Selecione um arquivo para visualizar o código
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Arquivo não encontrado: {fileName}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="flex items-center border-b border-border bg-card/30">
        <div className={cn("flex items-center gap-2 px-3 py-1.5 text-xs border-r border-border bg-background")}>
          <span>{fileName}</span>
          <X className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer" />
        </div>
      </div>
      <div className="px-4 py-1 text-[11px] text-muted-foreground border-b border-border bg-card/20">
        {file.path}
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs leading-5">
        {lines.map((line, i) => (
          <div key={i} className="flex hover:bg-accent/20">
            <span className="w-10 shrink-0 text-right pr-3 text-muted-foreground/50 select-none">{i + 1}</span>
            <pre className="flex-1 whitespace-pre" dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodeEditor;
