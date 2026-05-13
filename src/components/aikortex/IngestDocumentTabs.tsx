import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, Upload } from "lucide-react";
import { useIngestDocument, uploadKbFile, type IngestPayload } from "@/hooks/use-agent-knowledge-bases";

type Mode = "text" | "faq" | "file" | "url";

interface Props {
  agentId: string;
  kbId: string;
  initialTab?: Mode;
  onSuccess?: () => void;
}

/**
 * Reusable form for ingesting a document in 4 modes.
 * Used by AddDocumentDialog (agency UI) and AdminKbTestTab (debug).
 */
export default function IngestDocumentTabs({ agentId, kbId, initialTab = "text", onSuccess }: Props) {
  const ingest = useIngestDocument();
  const [mode, setMode] = useState<Mode>(initialTab);

  const [text, setText] = useState("");
  const [textTitle, setTextTitle] = useState("");

  const [faqTitle, setFaqTitle] = useState("");
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([
    { question: "", answer: "" },
  ]);

  const [file, setFile] = useState<File | null>(null);

  const [url, setUrl] = useState("");

  const [busy, setBusy] = useState(false);

  const updateFaq = (i: number, field: "question" | "answer", value: string) =>
    setFaqs((p) => p.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));

  const addFaq = () => setFaqs((p) => [...p, { question: "", answer: "" }]);
  const removeFaq = (i: number) => setFaqs((p) => p.filter((_, idx) => idx !== i));

  async function handleSubmit() {
    setBusy(true);
    try {
      let payload: IngestPayload;
      if (mode === "text") {
        if (!text.trim()) throw new Error("Conteúdo vazio");
        payload = { kb_id: kbId, source_type: "text", title: textTitle.trim() || "Texto sem título", raw_content: text };
      } else if (mode === "faq") {
        const valid = faqs.filter((f) => f.question.trim() && f.answer.trim());
        if (valid.length === 0) throw new Error("Adicione pelo menos uma pergunta/resposta");
        payload = { kb_id: kbId, source_type: "faq", title: faqTitle.trim() || "FAQ", faqs: valid };
      } else if (mode === "file") {
        if (!file) throw new Error("Selecione um arquivo");
        const { storage_path } = await uploadKbFile(agentId, file);
        payload = { kb_id: kbId, source_type: "file", title: file.name, storage_path };
      } else {
        if (!url.trim()) throw new Error("Informe a URL");
        payload = { kb_id: kbId, source_type: "url", title: new URL(url).hostname, url };
      }
      await ingest.mutateAsync(payload);
      onSuccess?.();
    } catch (e) {
      // toast handled by mutation; for upload/url errors toast manually
      if ((e as Error).message && !(e as any).__handled) {
        const { toast } = await import("sonner");
        toast.error((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="text">Texto</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="file">Arquivo</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="pt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Título</Label>
            <Input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="Ex: Política de cancelamento" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Conteúdo</Label>
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole o texto aqui..." />
            <p className="text-[11px] text-muted-foreground">{text.trim() ? text.trim().split(/\s+/).length : 0} palavras</p>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="pt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Título</Label>
            <Input value={faqTitle} onChange={(e) => setFaqTitle(e.target.value)} placeholder="Ex: FAQ de atendimento" />
          </div>
          {faqs.map((f, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Item {i + 1}</Label>
                {faqs.length > 1 && (
                  <button onClick={() => removeFaq(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input placeholder="Pergunta" value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} />
              <Textarea rows={2} placeholder="Resposta" value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addFaq} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </Button>
        </TabsContent>

        <TabsContent value="file" className="pt-3 space-y-2">
          <Label className="text-xs">Arquivo (TXT, MD, PDF, DOCX — máx 10MB)</Label>
          <Input
            type="file"
            accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <p className="text-xs text-muted-foreground">{file.name} — {(file.size / 1024).toFixed(1)} KB</p>
          )}
        </TabsContent>

        <TabsContent value="url" className="pt-3 space-y-2">
          <Label className="text-xs">URL pública (HTML/TXT/MD — máx 5MB)</Label>
          <Input type="url" placeholder="https://exemplo.com/sobre-nos" value={url} onChange={(e) => setUrl(e.target.value)} />
        </TabsContent>
      </Tabs>

      <Button onClick={handleSubmit} disabled={busy} className="w-full gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? "Processando..." : "Adicionar à base"}
      </Button>
    </div>
  );
}
