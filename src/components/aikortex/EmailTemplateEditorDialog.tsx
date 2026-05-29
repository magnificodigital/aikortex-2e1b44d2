import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Variable,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type EmailTemplate,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  renderTemplatePreview,
} from "@/hooks/use-email-templates";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplate | null;
};

/** Placeholders disponíveis pro usuário inserir nos campos. Mesmos nomes
 *  usados nas cadências (subject_template / message_template). */
const AVAILABLE_VARIABLES = [
  { key: "nome", label: "Nome", example: "Maria" },
  { key: "telefone", label: "Telefone", example: "(11) 99999-9999" },
  { key: "email", label: "Email", example: "maria@email.com" },
  { key: "empresa", label: "Empresa", example: "Magnífico Digital" },
];

const PREVIEW_VALUES = Object.fromEntries(
  AVAILABLE_VARIABLES.map((v) => [v.key, v.example]),
);

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

function VariableMenu({ onInsert }: { onInsert: (variable: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Variable className="w-3 h-3" /> Variável
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {AVAILABLE_VARIABLES.map((v) => (
          <DropdownMenuItem
            key={v.key}
            onClick={() => onInsert(`{${v.key}}`)}
            className="flex items-center justify-between gap-2"
          >
            <span>{v.label}</span>
            <code className="text-[10px] text-muted-foreground font-mono">{`{${v.key}}`}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1 rounded-t-md">
      <ToolbarButton
        title="Negrito"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Itálico"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Título"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-1" />
      <ToolbarButton
        title="Lista"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-1" />
      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href ?? "";
          const url = window.prompt("URL do link:", prev);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <Link2 className="w-3.5 h-3.5" />
      </ToolbarButton>
    </div>
  );
}

export default function EmailTemplateEditorDialog({ open, onOpenChange, template }: Props) {
  const isEdit = !!template;
  const createMut = useCreateEmailTemplate();
  const updateMut = useUpdateEmailTemplate();
  const saving = createMut.isPending || updateMut.isPending;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Placeholder.configure({ placeholder: "Olá {nome},\n\nComece a escrever o corpo do email…" }),
    ],
    content: bodyHtml,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[260px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => setBodyHtml(editor.getHTML()),
  });

  // Reseta state quando dialog abre — carrega o template em edição ou limpa pra criar novo
  useEffect(() => {
    if (!open) return;
    const nextName = template?.name ?? "";
    const nextSubject = template?.subject ?? "";
    const nextBody = template?.body_html ?? "";
    setName(nextName);
    setSubject(nextSubject);
    setBodyHtml(nextBody);
    editor?.commands.setContent(nextBody || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const insertSubjectVar = (variable: string) => {
    setSubject((prev) => prev + variable);
  };

  const insertBodyVar = (variable: string) => {
    editor?.chain().focus().insertContent(variable).run();
  };

  const previewSubject = useMemo(() => renderTemplatePreview(subject, PREVIEW_VALUES), [subject]);
  const previewBody = useMemo(() => renderTemplatePreview(bodyHtml, PREVIEW_VALUES), [bodyHtml]);

  const canSave = name.trim().length > 0 && subject.trim().length > 0 && bodyHtml.replace(/<[^>]*>/g, "").trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    const input = { name: name.trim(), subject: subject.trim(), body_html: bodyHtml };
    if (isEdit && template) {
      await updateMut.mutateAsync({ id: template.id, ...input });
    } else {
      await createMut.mutateAsync(input);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar template" : "Novo template de email"}</DialogTitle>
          <DialogDescription>
            Use <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{"{nome}"}</code>,{" "}
            <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{"{telefone}"}</code> e
            outras variáveis pra personalizar. O preview mostra como o email vai chegar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Editor */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do template *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Boas-vindas"
                maxLength={80}
              />
              <p className="text-[10px] text-muted-foreground">
                Identifica esse template na hora de selecionar nas cadências.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Assunto *</Label>
                <VariableMenu onInsert={insertSubjectVar} />
              </div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Olá {nome}, bem-vindo à {empresa}!"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Mensagem *</Label>
                <VariableMenu onInsert={insertBodyVar} />
              </div>
              <div className="rounded-md border border-input bg-background">
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preview</Label>
            <div className="rounded-md border border-border bg-background overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Assunto</p>
                <p className="text-sm font-medium text-foreground">
                  {previewSubject || <span className="text-muted-foreground italic">sem assunto</span>}
                </p>
              </div>
              <div
                className="px-4 py-4 prose prose-sm max-w-none min-h-[260px] dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: previewBody || '<p class="text-muted-foreground italic">Sem conteúdo</p>',
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Variáveis substituídas com valores de exemplo:{" "}
              {AVAILABLE_VARIABLES.map((v) => (
                <span key={v.key} className="mr-2">
                  <code className="bg-muted px-1 py-0.5 rounded">{`{${v.key}}`}</code> = {v.example}
                </span>
              ))}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
