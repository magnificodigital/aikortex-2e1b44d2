/**
 * StarkFloatingOrb — bubble flutuante do Stark Voice (LiveKit) pra
 * todas as paginas autenticadas.
 *
 * Regras de exibicao (delegadas pro mount em App.tsx):
 *  - bubble_enabled = true (prefs do user)
 *  - NAO mostra em /home (StarkInterface ja' tem o orb central)
 *  - NAO mostra em /aikortex/agents/* (AgentDetail monta StarkBubble proprio do wizard)
 *  - NAO mostra em rotas publicas (/, /pricing, /login)
 *
 * UX:
 *  - Idle: orb dim, click pra conectar
 *  - Connecting/Listening/Speaking: orb com glow + animacao
 *  - Erro / sem creditos: orb vermelho + toast
 *  - Click no orb ativo = desconecta
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStarkLiveKit, type StarkPageContext } from "@/hooks/use-stark-livekit";
import { useStarkPrefs } from "@/hooks/use-stark-prefs";

// Paths onde NAO mostrar (interface propria do Stark ja' ocupa).
const SKIP_EXACT = new Set(["/", "/home", "/login", "/signup", "/pricing"]);
const SKIP_PREFIXES = ["/aikortex/agents/", "/cadastro-cliente/"];

function shouldShow(pathname: string): boolean {
  if (SKIP_EXACT.has(pathname)) return false;
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) return false;
  return true;
}

// Map de path → nome human-friendly pro Stark saber "onde o user esta"
// no system prompt. Regex-based pra suportar dinamicos (/clientes/:id).
const ROUTE_LABELS: { pattern: RegExp; label: string; entity?: (m: RegExpMatchArray) => StarkPageContext["entity"] }[] = [
  { pattern: /^\/clients\/([^/]+)$/,          label: "detalhes do cliente",  entity: (m) => ({ type: "client", id: m[1] }) },
  { pattern: /^\/clients$/,                    label: "lista de clientes" },
  { pattern: /^\/aikortex\/crm$/,             label: "CRM (Kanban de leads)" },
  { pattern: /^\/aikortex$/,                   label: "CRM (Kanban de leads)" },
  { pattern: /^\/sales$/,                      label: "vendas" },
  { pattern: /^\/tasks$/,                      label: "tarefas" },
  { pattern: /^\/team$/,                       label: "equipe" },
  { pattern: /^\/financial$/,                  label: "financeiro (BRL)" },
  { pattern: /^\/financeiro$/,                 label: "financeiro (BRL)" },
  { pattern: /^\/reports$/,                    label: "relatorios" },
  { pattern: /^\/projects$/,                   label: "projetos" },
  { pattern: /^\/proposals$/,                  label: "propostas comerciais" },
  { pattern: /^\/contracts$/,                  label: "contratos" },
  { pattern: /^\/partners$/,                   label: "parceiros" },
  { pattern: /^\/apps$/,                       label: "apps (integracoes)" },
  { pattern: /^\/app-builder$/,                label: "construtor de app" },
  { pattern: /^\/templates$/,                  label: "galeria de templates de agentes" },
  { pattern: /^\/dashboard$/,                  label: "dashboard geral" },
  { pattern: /^\/settings/,                    label: "configuracoes" },
];

function inferPageContext(pathname: string): StarkPageContext {
  for (const r of ROUTE_LABELS) {
    const m = pathname.match(r.pattern);
    if (m) {
      return {
        path: pathname,
        route: r.label,
        entity: r.entity ? r.entity(m) : undefined,
      };
    }
  }
  return { path: pathname };
}

export function StarkFloatingOrb() {
  const location = useLocation();
  const { prefs, loading } = useStarkPrefs();
  const [active, setActive] = useState(false);

  const pageContext = useMemo(
    () => inferPageContext(location.pathname),
    [location.pathname],
  );
  const livekit = useStarkLiveKit({ active, pageContext });

  // Sessao SOBREVIVE a navegacao entre paginas de gestao — essencial pro
  // fluxo Jarvis ("me leva pro financeiro" nao pode derrubar a ligacao).
  // So desconecta ao entrar em pagina sem orb (/home tem orb proprio e
  // usaria o MESMO room LiveKit — duplicaria participante).
  useEffect(() => {
    if (!shouldShow(location.pathname)) setActive(false);
  }, [location.pathname]);

  // Esconde quando hook reporta erro de credito (UX evita reabertura imediata)
  useEffect(() => {
    if (livekit.state === "no_credits") setActive(false);
  }, [livekit.state]);

  if (loading) return null;
  if (!prefs.bubble_enabled) return null;
  if (!shouldShow(location.pathname)) return null;

  const isBusy = livekit.state === "connecting";
  const isOn = active && (livekit.state === "listening" || livekit.state === "speaking" || livekit.state === "connecting");
  const isError = livekit.state === "error" || livekit.state === "no_credits";

  const intensity = livekit.intensity || 0;
  const scale = 1 + (isOn ? intensity * 0.35 : 0);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-2">
      {isOn && (
        <button
          onClick={() => setActive(false)}
          className="w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition"
          title="Desligar Stark"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={() => setActive(v => !v)}
        disabled={isBusy}
        className={cn(
          "relative w-14 h-14 rounded-full transition-all duration-200 shadow-xl",
          "flex items-center justify-center",
          isOn   && "bg-primary text-primary-foreground",
          !isOn && !isError && "bg-card border border-border hover:bg-primary/10 hover:border-primary/40 text-foreground",
          isError && "bg-destructive/90 text-destructive-foreground",
        )}
        style={{ transform: `scale(${scale.toFixed(2)})` }}
        title={
          isError ? (livekit.error || "Erro no Stark") :
          isOn    ? "Falando com Stark — clique pra parar" :
                    "Falar com Stark"
        }
      >
        {isError ? (
          <AlertTriangle className="w-5 h-5" />
        ) : isBusy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}

        {isOn && livekit.state === "listening" && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping" />
        )}
      </button>
    </div>
  );
}
