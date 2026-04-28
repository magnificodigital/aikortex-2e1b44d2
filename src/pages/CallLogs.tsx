import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone, PhoneIncoming, PhoneOutgoing, Monitor, Clock, CheckCircle,
  XCircle, AlertTriangle, Activity, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  completed:   { label: "Concluída",    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  failed:      { label: "Falhou",       color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  no_answer:   { label: "Sem resposta", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",    icon: AlertTriangle },
  in_progress: { label: "Em andamento", color: "bg-blue-500/10 text-blue-600 border-blue-500/20",          icon: Activity },
  initiated:   { label: "Iniciada",     color: "bg-muted text-muted-foreground border-border",             icon: Phone },
  ringing:     { label: "Tocando",      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",          icon: Phone },
};

const formatDuration = (s: number | null) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const CallLogs = () => {
  const [page, setPage] = useState(0);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterDirection, setFilterDirection] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [transcriptDrawer, setTranscriptDrawer] = useState<any>(null);

  const { data: agents } = useQuery({
    queryKey: ["call-log-agents"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("user_agents").select("id, name").eq("user_id", user.id);
      return data || [];
    },
  });

  const { data: callData, isLoading } = useQuery({
    queryKey: ["call-logs", page, filterAgent, filterDirection, filterStatus],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { logs: [], count: 0 };

      let query = supabase
        .from("call_logs")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAgent !== "all") query = query.eq("agent_id", filterAgent);
      if (filterDirection !== "all") query = query.eq("direction", filterDirection);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);

      const { data, count } = await query;
      return { logs: data || [], count: count || 0 };
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["call-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, totalDuration: 0, completed: 0, today: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data: monthLogs } = await supabase
        .from("call_logs")
        .select("status, duration_seconds, created_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);

      const logs = monthLogs || [];
      return {
        total: logs.length,
        totalDuration: logs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0),
        completed: logs.filter(l => l.status === "completed").length,
        today: logs.filter(l => l.created_at && l.created_at >= startOfDay).length,
      };
    },
  });

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents?.forEach(a => { map[a.id] = a.name; });
    return map;
  }, [agents]);

  const totalPages = Math.ceil((callData?.count || 0) / PAGE_SIZE);
  const attendanceRate = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statCards = [
    { label: "Total ligações", value: stats?.total || 0, icon: Phone, color: "text-primary" },
    { label: "Tempo total", value: formatDuration(stats?.totalDuration || 0), icon: Clock, color: "text-blue-500" },
    { label: "Taxa de atendimento", value: `${attendanceRate}%`, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Ligações hoje", value: stats?.today || 0, icon: Activity, color: "text-orange-500" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Ligações</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe todas as chamadas dos seus agentes.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterAgent} onValueChange={v => { setFilterAgent(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Agente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os agentes</SelectItem>
              {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDirection} onValueChange={v => { setFilterDirection(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Direção" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="no_answer">Sem resposta</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Direção</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Canal</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Número</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Agente</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Duração</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Data</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                ) : !callData?.logs.length ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhuma ligação encontrada.</td></tr>
                ) : (
                  callData.logs.map((log: any) => {
                    const st = STATUS_MAP[log.status] || STATUS_MAP.initiated;
                    const StatusIcon = st.icon;
                    return (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          {log.direction === "inbound"
                            ? <PhoneIncoming className="w-4 h-4 text-blue-500" />
                            : <PhoneOutgoing className="w-4 h-4 text-emerald-500" />}
                        </td>
                        <td className="px-4 py-3">
                          {log.channel === "phone"
                            ? <Phone className="w-4 h-4 text-muted-foreground" />
                            : <Monitor className="w-4 h-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {log.direction === "outbound" ? log.phone_to : log.phone_from || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">{log.agent_id ? agentNameMap[log.agent_id] || "—" : "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatDuration(log.duration_seconds)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] gap-1 ${st.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {st.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {log.created_at
                            ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost" size="sm"
                            className="text-xs h-7 gap-1"
                            onClick={() => setTranscriptDrawer(log)}
                            disabled={!log.transcript || (Array.isArray(log.transcript) && log.transcript.length === 0)}
                          >
                            <FileText className="w-3 h-3" /> Transcrição
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Transcript Drawer */}
      <Sheet open={!!transcriptDrawer} onOpenChange={() => setTranscriptDrawer(null)}>
        <SheetContent className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Transcrição da Ligação
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-3 pr-2">
              {transcriptDrawer?.transcript && Array.isArray(transcriptDrawer.transcript) ? (
                transcriptDrawer.transcript.map((entry: any, i: number) => (
                  <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                      entry.role === "user"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted"
                    }`}>
                      <span className="text-[10px] text-muted-foreground block mb-0.5">
                        {entry.role === "user" ? "Usuário" : "Agente"}
                      </span>
                      {entry.content || entry.text || ""}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-8">Nenhuma transcrição disponível.</p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default CallLogs;
