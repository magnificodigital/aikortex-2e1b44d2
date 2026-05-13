// TODO: remove after Sprint 2.5-d (UI completa de Knowledge Base)
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUserAgents } from "@/hooks/use-user-agents";
import { useIngestDocument, uploadKbFile, type IngestPayload } from "@/hooks/use-agent-knowledge-bases";
import { Loader2, FlaskConical, CheckCircle2, XCircle } from "lucide-react";

const SAMPLE_TEXT = `A clínica odontológica Sorriso & Cia atende pacientes desde 2015 no centro da cidade. Oferecemos serviços de clínica geral, ortodontia, implantes, estética dental e odontopediatria. O horário de funcionamento é de segunda a sexta das 8h às 19h, e aos sábados das 9h às 13h. Atendemos os principais convênios da região, incluindo Unimed, Bradesco Saúde, SulAmérica e Amil. Para consultas particulares, oferecemos parcelamento em até 12 vezes no cartão de crédito ou boleto bancário. Nossa equipe é composta por dentistas especialistas com pós-graduação reconhecida pelo CFO. O agendamento de consultas pode ser feito pelo telefone, WhatsApp ou pelo nosso site. Em casos de emergência odontológica fora do horário comercial, mantemos um plantão via WhatsApp para orientações iniciais. Realizamos a limpeza profissional a cada seis meses como parte da nossa rotina preventiva. O primeiro atendimento inclui anamnese completa, avaliação radiográfica e plano de tratamento personalizado. Localização: Rua das Acácias, 1234 — sala 502. Estacionamento conveniado disponível no edifício.`;

const SAMPLE_FAQS = [
  { question: "Quais convênios vocês atendem?", answer: "Atendemos Unimed, Bradesco Saúde, SulAmérica e Amil." },
  { question: "Qual o horário de funcionamento?", answer: "Segunda a sexta das 8h às 19h e sábados das 9h às 13h." },
  { question: "Como faço para agendar uma consulta?", answer: "Pelo telefone, WhatsApp ou pelo nosso site." },
];

interface TestResult {
  ok: boolean;
  document_id?: string;
  chunks_count?: number;
  total_tokens?: number;
  elapsed_ms?: number;
  matches?: number;
  sample_similarity?: number | null;
  metadata?: Record<string, any>;
  error?: string;
}

type Mode = "text" | "faq" | "file" | "url";

export default function AdminKbTestTab() {
  const { agents, loading: loadingAgents } = useUserAgents();
  const ingestMutation = useIngestDocument();

  const [agentId, setAgentId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("text");
  const [textContent, setTextContent] = useState(SAMPLE_TEXT);
  const [faqs, setFaqs] = useState(SAMPLE_FAQS);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("https://www.aikortex.com.br");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const updateFaq = (i: number, field: "question" | "answer", value: string) => {
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));
  };

  async function handleTestIngest() {
    if (!agentId) {
      setResult({ ok: false, error: "Selecione um agente." });
      return;
    }
    if (mode === "file" && !file) {
      setResult({ ok: false, error: "Selecione um arquivo." });
      return;
    }
    if (mode === "url" && !url.trim()) {
      setResult({ ok: false, error: "Informe uma URL." });
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      // 1. Cria KB de teste
      const { data: kb, error: kbErr } = await (supabase
        .from("agent_knowledge_bases" as any)
        .insert({ agent_id: agentId, name: `Test KB ${Date.now()}` })
        .select()
        .single() as any);

      if (kbErr || !kb) throw new Error(`Falha ao criar KB: ${kbErr?.message ?? "unknown"}`);

      // 2. Monta payload por modo
      let payload: IngestPayload;
      if (mode === "text") {
        payload = { kb_id: kb.id, source_type: "text", title: "Test Text", raw_content: textContent };
      } else if (mode === "faq") {
        payload = { kb_id: kb.id, source_type: "faq", title: "Test FAQ", faqs };
      } else if (mode === "file") {
        const { storage_path } = await uploadKbFile(agentId, file!);
        payload = { kb_id: kb.id, source_type: "file", title: file!.name, storage_path };
      } else {
        payload = { kb_id: kb.id, source_type: "url", title: new URL(url).hostname, url };
      }

      const ingest = await ingestMutation.mutateAsync(payload);

      // 3. Pega 1ª chunk e roda match
      const { data: firstChunk, error: chunkErr } = await (supabase
        .from("kb_chunks" as any)
        .select("embedding")
        .eq("knowledge_base_id", kb.id)
        .order("chunk_index", { ascending: true })
        .limit(1)
        .single() as any);

      if (chunkErr || !firstChunk?.embedding) {
        throw new Error(`Falha ao ler chunk: ${chunkErr?.message ?? "no embedding"}`);
      }

      const { data: matches, error: rpcErr } = await (supabase.rpc("match_kb_chunks" as any, {
        p_agent_id: agentId,
        p_query_embedding: firstChunk.embedding,
        p_match_count: 5,
        p_min_similarity: 0.0,
      }) as any);

      if (rpcErr) throw new Error(`match_kb_chunks falhou: ${rpcErr.message}`);

      setResult({
        ok: true,
        document_id: ingest.document_id,
        chunks_count: ingest.chunks_count,
        total_tokens: ingest.total_tokens,
        elapsed_ms: ingest.elapsed_ms,
        matches: matches?.length ?? 0,
        sample_similarity: matches?.[0]?.similarity ?? null,
        metadata: (ingest as any).metadata,
      });
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">KB Test (temporário)</h2>
        <Badge variant="outline" className="text-[10px]">Sprint 2.5-c</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Cria uma KB descartável, ingere via <code>ingest-document</code> (texto, FAQ, arquivo ou URL) e
        valida <code>match_kb_chunks</code> end-to-end. Remover após Sprint 2.5-d.
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Configuração do teste</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agente alvo</Label>
            <Select value={agentId} onValueChange={setAgentId} disabled={loadingAgents}>
              <SelectTrigger><SelectValue placeholder={loadingAgents ? "Carregando..." : "Selecione um agente"} /></SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} <span className="text-muted-foreground text-xs ml-2">({a.id.slice(0, 8)})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="text">Texto</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="file">Arquivo</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="pt-3">
              <Label className="text-xs">Conteúdo</Label>
              <Textarea rows={10} value={textContent} onChange={(e) => setTextContent(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{textContent.split(/\s+/).length} palavras</p>
            </TabsContent>

            <TabsContent value="faq" className="pt-3 space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="space-y-1 border rounded-md p-3">
                  <Label className="text-xs">Pergunta {i + 1}</Label>
                  <Input value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} />
                  <Label className="text-xs mt-2 block">Resposta {i + 1}</Label>
                  <Textarea rows={2} value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="file" className="pt-3 space-y-2">
              <Label className="text-xs">Arquivo (TXT, MD, PDF, DOCX — máx 10MB)</Label>
              <Input
                type="file"
                accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </TabsContent>

            <TabsContent value="url" className="pt-3 space-y-2">
              <Label className="text-xs">URL pública (HTML/TXT/MD — máx 5MB)</Label>
              <Input
                type="url"
                placeholder="https://exemplo.com/sobre-nos"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </TabsContent>
          </Tabs>

          <Button onClick={handleTestIngest} disabled={running || !agentId}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Criar KB de teste + ingerir
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.ok ? "border-green-500/40" : "border-destructive/40"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {result.ok ? (
                <><CheckCircle2 className="h-5 w-5 text-green-500" /> Resultado do teste</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Erro no teste</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm font-mono">
            {result.ok ? (
              <>
                <div className="space-y-1">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">✅ Ingestão</div>
                  <div>Document ID: <span className="text-primary">{result.document_id}</span></div>
                  <div>Chunks gerados: <span className="text-primary">{result.chunks_count}</span></div>
                  <div>Tokens estimados: <span className="text-primary">{result.total_tokens}</span></div>
                  <div>Latência: <span className="text-primary">{result.elapsed_ms}ms</span></div>
                  {result.metadata && Object.keys(result.metadata).length > 0 && (
                    <div className="pt-1">
                      <div className="text-xs text-muted-foreground">Metadata:</div>
                      <pre className="text-xs bg-muted/40 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="space-y-1 pt-2 border-t">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">✅ Match semântico</div>
                  <div>Resultados: <span className="text-primary">{result.matches}</span> <span className="text-muted-foreground text-xs">(esperado: ≥ 1)</span></div>
                  <div>
                    Similaridade do top:{" "}
                    <span className="text-primary">
                      {result.sample_similarity !== null && result.sample_similarity !== undefined
                        ? result.sample_similarity.toFixed(4)
                        : "n/a"}
                    </span>{" "}
                    <span className="text-muted-foreground text-xs">(esperado: &gt; 0.9)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-destructive whitespace-pre-wrap">{result.error}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
