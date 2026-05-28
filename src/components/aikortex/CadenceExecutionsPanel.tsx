import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  PauseCircle,
  Search,
  Send,
  TrendingUp,
  UserX,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useCadenceExecutions,
  useCadenceExecutionStats,
  type CadenceExecutionRow,
} from "@/hooks/use-cadence-executions";
import { useAgentCadences } from "@/hooks/use-agent-cadences";
import type { CadenceExecutionStatus } from "@/types/agent-cadences";

interface Props {
  agentId: string;
}

const STATUS_META: Record<CadenceExecutionStatus, {
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: { label: "Aguardando", badge: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Clock },
  running: { label: "Executando", badge: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Activity },
  completed: { label: "Concluída", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Falhou", badge: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
  cancelled: { label: "Cancelada", badge: "bg-muted text-muted-foreground border-border", icon: XCircle },
  paused: { label: "Pausada", badge: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: PauseCircle },
};

/**
 * Converte erros técnicos do engine em mensagens humanas pro usuário.
 * Trata erros conhecidos (códigos do engine) e tenta extrair a mensagem
 * limpa de respostas JSON de provedores (Resend, etc.).
 */
function humanizeError(err: string | null | undefined): string {
  if (!err) return "";

  // Códigos do engine
  if (err === "recipient_unsubscribed") return "Contato descadastrou da lista";
  if (err.startsWith("TRIAL_EXHAUSTED")) return "Trial gratuito esgotado — conecte sua chave Resend";
  if (err.startsWith("MISSING_FROM_EMAIL")) return "Email do remetente não configurado em Integrações";
  if (err.startsWith("MISSING_CHANNEL_CONFIG")) return "Provedor de email não conectado";
  if (err.startsWith("MISSING_TEMPLATE_NAME")) return "Template WhatsApp não configurado no step";
  if (err.startsWith("MISSING_WABA_CONFIG")) return "WhatsApp não conectado em Integrações";
  if (err === "Contato sem email") return "Contato sem campo email";
  if (err === "Contato sem telefone") return "Contato sem campo telefone";

  // WhatsApp Meta Cloud API: "WhatsApp 400: {"error":{"message":"...","code":131009}}"
  const waMatch = err.match(/^WhatsApp (\d+):\s*(.+)$/);
  if (waMatch) {
    const code = waMatch[1];
    try {
      const parsed = JSON.parse(waMatch[2].trim());
      const e = parsed?.error;
      if (e?.code === 131026) return "WhatsApp: número não tem WhatsApp ou janela 24h expirada";
      if (e?.code === 131009) return "WhatsApp: template não existe ou não foi aprovado";
      if (e?.code === 131008) return "WhatsApp: parâmetros do template inválidos";
      if (e?.code === 132012) return "WhatsApp: template pausado pela Meta (qualidade baixa)";
      if (e?.code === 132001) return "WhatsApp: número destino inválido";
      if (e?.code === 190 || e?.code === 102) return "WhatsApp: token inválido ou expirado";
      if (e?.message) return `WhatsApp: ${e.message}`;
    } catch { /* não-JSON, cai abaixo */ }
    return `WhatsApp ${code}`;
  }
  if (err.startsWith("WhatsApp: ")) return err;

  // Resend: "Resend 403: {"statusCode":403,"message":"...","name":"validation_error"}"
  const resendMatch = err.match(/^Resend (\d+):\s*(.+)$/);
  if (resendMatch) {
    const code = resendMatch[1];
    const payload = resendMatch[2].trim();
    try {
      const parsed = JSON.parse(payload);
      if (parsed.message) {
        // Tradução de mensagens recorrentes do Resend
        const m = parsed.message as string;
        if (m.includes("domain is not verified")) {
          const dom = m.match(/The (.+?) domain is not verified/)?.[1];
          return `Domínio ${dom ?? "do remetente"} não verificado no Resend`;
        }
        if (m.includes("API key is invalid") || code === "401") return "Chave Resend inválida ou revogada";
        if (m.includes("rate limit")) return "Resend: limite de envios excedido";
        return `Resend: ${m}`;
      }
    } catch {
      /* não-JSON, cai no fallback abaixo */
    }
    return `Resend ${code}: ${payload.slice(0, 80)}`;
  }

  // Fallback: corta string longa
  return err.length > 90 ? `${err.slice(0, 90)}…` : err;
}

function formatRel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const absMin = Math.abs(diffMs) / 60_000;
  const future = diffMs > 0;
  if (absMin < 1) return future ? "agora" : "agora há pouco";
  if (absMin < 60) return future ? `em ${Math.round(absMin)}min` : `há ${Math.round(absMin)}min`;
  const absH = absMin / 60;
  if (absH < 24) return future ? `em ${Math.round(absH)}h` : `há ${Math.round(absH)}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color = "text-foreground",
  bg = "bg-muted/30",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
  bg?: string;
}) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start gap-2.5">
        <div className={`w-9 h-9 rounded-md ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">{label}</p>
          <p className={`text-xl font-bold ${color} leading-tight mt-0.5`}>{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function CadenceExecutionsPanel({ agentId }: Props) {
  const { data: cadences = [] } = useAgentCadences(agentId);
  const [filterStatus, setFilterStatus] = useState<CadenceExecutionStatus | "all">("all");
  const [filterCadence, setFilterCadence] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [drillDown, setDrillDown] = useState<CadenceExecutionRow | null>(null);

  const { data: executions = [], isLoading } = useCadenceExecutions(agentId, {
    status: filterStatus,
    cadenceId: filterCadence,
    contactSearch: search,
    pageSize: 200,
  });
  const { data: stats } = useCadenceExecutionStats(agentId);

  const successRatePct = useMemo(() => {
    if (!stats || stats.successRate === 0) return "—";
    return `${Math.round(stats.successRate * 100)}%`;
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          icon={Send}
          label="Total"
          value={stats?.total ?? 0}
          hint="execuções criadas"
          color="text-foreground"
          bg="bg-primary/10"
        />
        <StatCard
          icon={Clock}
          label="Em andamento"
          value={(stats?.pending ?? 0) + (stats?.running ?? 0)}
          hint={`${stats?.pending ?? 0} aguardando • ${stats?.running ?? 0} executando`}
          color="text-blue-600"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de sucesso"
          value={successRatePct}
          hint={`${stats?.completed ?? 0} concluídas • ${stats?.failed ?? 0} falharam`}
          color="text-emerald-600"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={UserX}
          label="Descadastrados"
          value={stats?.unsubscribedCount ?? 0}
          hint="clicaram em opt-out"
          color="text-amber-600"
          bg="bg-amber-500/10"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCadence} onValueChange={setFilterCadence}>
          <SelectTrigger className="h-9 w-[200px] text-xs">
            <SelectValue placeholder="Cadência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cadências</SelectItem>
            {cadences.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="h-9 w-[180px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(STATUS_META) as CadenceExecutionStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por contato..."
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Lista */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : executions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma execução encontrada</p>
            <p className="text-xs text-muted-foreground/70">
              {filterStatus !== "all" || filterCadence !== "all" || search
                ? "Tente ajustar os filtros acima."
                : "Quando uma cadência disparar, a execução vai aparecer aqui."}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[480px]">
            <div className="divide-y divide-border">
              {executions.map((e) => {
                const meta = STATUS_META[e.status];
                const StatusIcon = meta.icon;
                const isAuto = e.metadata?.auto_triggered === true;
                return (
                  <button
                    key={e.id}
                    onClick={() => setDrillDown(e)}
                    className="w-full text-left p-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
                  >
                    <StatusIcon className={`w-4 h-4 shrink-0 ${meta.badge.split(" ")[1]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {e.contact_name || e.contact_phone || "(sem nome)"}
                        </span>
                        {isAuto && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">auto</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {e.cadence_name ?? "Cadência removida"} · Step {e.current_step}/{e.total_steps}
                        {e.status === "pending" && e.next_run_at && ` · próximo ${formatRel(e.next_run_at)}`}
                        {e.status === "failed" && e.last_error && ` · ${humanizeError(e.last_error)}`}
                        {e.status === "cancelled" && e.last_error === "recipient_unsubscribed" && ` · contato descadastrou`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.badge}`}>
                      {meta.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Drill-down dialog */}
      <Dialog open={!!drillDown} onOpenChange={(o) => { if (!o) setDrillDown(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {drillDown && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Execução de cadência
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {drillDown.cadence_name} · {drillDown.contact_name || "(sem nome)"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</p>
                    <Badge variant="outline" className={`text-[11px] ${STATUS_META[drillDown.status].badge}`}>
                      {STATUS_META[drillDown.status].label}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Progresso</p>
                    <p className="text-sm font-medium">Step {drillDown.current_step} de {drillDown.total_steps}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Iniciada</p>
                    <p className="font-mono">{new Date(drillDown.started_at).toLocaleString("pt-BR")}</p>
                  </div>
                  {drillDown.next_run_at && drillDown.status === "pending" && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Próximo disparo</p>
                      <p className="font-mono">{new Date(drillDown.next_run_at).toLocaleString("pt-BR")}</p>
                    </div>
                  )}
                  {drillDown.completed_at && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Finalizada</p>
                      <p className="font-mono">{new Date(drillDown.completed_at).toLocaleString("pt-BR")}</p>
                    </div>
                  )}
                </div>

                {drillDown.metadata?.auto_triggered === true && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary" />
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Auto-disparada</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Criada automaticamente pelo trigger de tabela quando uma nova linha foi inserida.
                    </p>
                  </div>
                )}

                {drillDown.last_error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                      <p className="text-[10px] uppercase tracking-wider text-destructive font-semibold">Último erro</p>
                    </div>
                    <p className="text-[12px] text-destructive">{humanizeError(drillDown.last_error)}</p>
                    <details className="group">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                        Ver mensagem técnica
                      </summary>
                      <p className="text-[10px] font-mono text-muted-foreground break-all mt-1.5 p-2 rounded bg-muted/40">
                        {drillDown.last_error}
                      </p>
                    </details>
                  </div>
                )}

                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contato</p>
                  <div className="rounded-md bg-muted/30 p-2 space-y-1 font-mono text-[11px]">
                    {drillDown.contact_name && <div>Nome: {drillDown.contact_name}</div>}
                    {drillDown.contact_phone && <div>Telefone: {drillDown.contact_phone}</div>}
                    {drillDown.contact_metadata && Object.entries(drillDown.contact_metadata).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="truncate">{k}: <span className="text-muted-foreground">{String(v)}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
