import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";
import { Loader2, Sparkles, FlaskConical, ChevronDown, Check, AlertTriangle, X } from "lucide-react";

// Bateria de testes (Clint-style): a IA gera clientes fictícios e conversa com o
// agente no seu lugar, mostrando onde acerta e erra. Gera personas (1 request) e
// roda cada uma em request separado (evita timeout), exibindo resultados ao vivo.

type Persona = { name: string; profile: string; goal: string; style: string; opening: string };
type Verdict = "good" | "issues" | "bad";
type Result = {
  persona: Persona;
  status: "pending" | "running" | "done" | "error";
  transcript?: { role: "persona" | "agent"; text: string }[];
  evaluation?: { verdict: Verdict; score: number; highlights: string[] };
  error?: string;
};

const MODES: { key: string; label: string }[] = [
  { key: "balanced", label: "Mistura equilibrada" },
  { key: "objections", label: "Foco em objeções" },
  { key: "doubts", label: "Foco em dúvidas" },
];

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: any }> = {
  good: { label: "Atendeu bem", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", Icon: Check },
  issues: { label: "Com falhas", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", Icon: AlertTriangle },
  bad: { label: "Falhou", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: X },
};

async function apiToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("sessão expirada");
  return token;
}

export default function AgentTestBattery({ agentId }: { agentId?: string }) {
  const [mode, setMode] = useState("balanced");
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const generate = async () => {
    if (!agentId || generating) return;
    setGenerating(true);
    setResults([]);
    try {
      const token = await apiToken();
      const resp = await fetch(fnUrl("agent-test-battery"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", agentId, mode, count: 6 }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
      const personas: Persona[] = json.personas ?? [];
      if (personas.length === 0) throw new Error("não gerou personas");
      setResults(personas.map((p) => ({ persona: p, status: "pending" })));
    } catch (e) {
      toast.error(`Falha ao gerar personas: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const runAll = async () => {
    if (!agentId || running || results.length === 0) return;
    setRunning(true);
    try {
      const token = await apiToken();
      // roda em série pra não sobrecarregar (cada persona é 1 request)
      for (let i = 0; i < results.length; i++) {
        setResults((prev) => prev.map((r, k) => (k === i ? { ...r, status: "running" } : r)));
        try {
          const resp = await fetch(fnUrl("agent-test-battery"), {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "run", agentId, mode, persona: results[i].persona }),
          });
          const json = await resp.json();
          if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
          setResults((prev) => prev.map((r, k) => (k === i ? { ...r, status: "done", transcript: json.transcript, evaluation: json.evaluation } : r)));
        } catch (e) {
          setResults((prev) => prev.map((r, k) => (k === i ? { ...r, status: "error", error: (e as Error).message } : r)));
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const doneCount = results.filter((r) => r.status === "done").length;
  const avgScore = doneCount > 0
    ? Math.round(results.filter((r) => r.evaluation).reduce((a, r) => a + (r.evaluation!.score || 0), 0) / doneCount)
    : null;

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" /> Bateria de testes
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          A IA cria clientes fictícios, conversa com o agente no seu lugar e mostra onde ele acerta e erra.
        </p>
      </div>

      {/* Setup */}
      {results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center mx-auto"><Sparkles className="w-6 h-6" /></div>
          <p className="text-sm text-muted-foreground">Que tipo de cliente simular?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  mode === m.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating || !agentId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Gerando personas…" : "Gerar 6 personas"}
          </button>
          <p className="text-[11px] text-muted-foreground/60">O custo da geração/teste é debitado dos créditos de IA (sandbox — nada é enviado a clientes reais).</p>
        </div>
      )}

      {/* Personas + resultados */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {doneCount}/{results.length} testadas{avgScore != null && ` · média ${avgScore}/100`}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={generate} disabled={generating || running} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                Gerar de novo
              </button>
              <button
                type="button"
                onClick={runAll}
                disabled={running || generating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                {running ? "Rodando…" : "Rodar bateria"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {results.map((r, i) => {
              const v = r.evaluation ? VERDICT_STYLE[r.evaluation.verdict] : null;
              const isOpen = expanded === i;
              return (
                <div key={i} className="rounded-xl border border-border bg-card/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-card/60"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold shrink-0">
                      {r.persona.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.persona.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.persona.profile}</p>
                    </div>
                    {r.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                    {r.status === "pending" && <span className="text-[10px] text-muted-foreground/60 shrink-0">na fila</span>}
                    {r.status === "error" && <span className="text-[10px] text-destructive shrink-0">erro</span>}
                    {v && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${v.cls}`}>
                        <v.Icon className="w-2.5 h-2.5" /> {v.label} · {r.evaluation!.score}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
                      {r.evaluation?.highlights && r.evaluation.highlights.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {r.evaluation.highlights.map((h, k) => <li key={k}>• {h}</li>)}
                        </ul>
                      )}
                      {r.transcript && (
                        <div className="space-y-1.5">
                          {r.transcript.map((m, k) => (
                            <div key={k} className={`flex ${m.role === "persona" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-[13px] ${m.role === "persona" ? "bg-primary/10 text-foreground rounded-br-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                                {m.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!r.transcript && r.status !== "done" && (
                        <p className="text-xs text-muted-foreground/60">Rode a bateria pra ver a conversa e o veredito.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
