import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Activity, RefreshCcw, Loader2, AlertCircle, Plus } from "lucide-react";
import AddLLMFromCatalogDialog from "./AddLLMFromCatalogDialog";

type LLM = {
  id: string;
  provider: string;
  model_id: string;
  display_name: string | null;
  tier: string;
  priority: number;
  status: string;
  active: boolean;
  supports_tools: boolean;
  consecutive_failures: number;
  last_health_check_at: string | null;
  last_health_check_error: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  dead: "bg-red-500/15 text-red-600 border-red-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

const AdminLLMsTab = () => {
  const [rows, setRows] = useState<LLM[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState<string | null>(null);
  const [pingingAll, setPingingAll] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("available_llms")
      .select("*")
      .order("tier", { ascending: true })
      .order("priority", { ascending: true });
    if (error) {
      toast.error("Falha ao carregar modelos: " + error.message);
    } else {
      setRows((data as LLM[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (row: LLM, next: boolean) => {
    const { error } = await supabase
      .from("available_llms")
      .update({ active: next })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${row.model_id} ${next ? "ativado" : "desativado"}`);
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, active: next } : r)));
    }
  };

  const updatePriority = async (row: LLM, value: number) => {
    if (Number.isNaN(value)) return;
    const { error } = await supabase
      .from("available_llms")
      .update({ priority: value })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, priority: value } : r)));
  };

  const runHealthcheck = async (model_id?: string) => {
    const target = model_id || "all";
    if (model_id) setPinging(model_id);
    else setPingingAll(true);
    try {
      const body = model_id ? { models: [model_id] } : {};
      const { data, error } = await supabase.functions.invoke("healthcheck-llm-models", {
        body,
      });
      if (error) throw error;
      const summary = (data as any)?.summary;
      toast.success(
        `Healthcheck ${target}: ${summary?.ok ?? "?"} ok / ${summary?.failed ?? "?"} falhas`,
      );
      await load();
    } catch (e) {
      toast.error("Healthcheck falhou: " + (e as Error).message);
    } finally {
      setPinging(null);
      setPingingAll(false);
    }
  };

  const grouped = useMemo(() => {
    const free = rows.filter((r) => r.tier === "free");
    const paid = rows.filter((r) => r.tier === "paid");
    return { free, paid };
  }, [rows]);

  const alreadyAdded = useMemo(() => new Set(rows.map((r) => r.model_id)), [rows]);

  const renderTable = (data: LLM[], title: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="outline" className="text-xs">{data.length} modelos</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="w-[120px]">Provider</TableHead>
                <TableHead className="w-[100px]">Prioridade</TableHead>
                <TableHead className="w-[80px]">Tools</TableHead>
                <TableHead className="w-[110px]">Falhas</TableHead>
                <TableHead className="w-[160px]">Último check</TableHead>
                <TableHead className="w-[90px]">Ativo</TableHead>
                <TableHead className="w-[90px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge className={STATUS_COLORS[row.status] || STATUS_COLORS.unknown}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{row.display_name || row.model_id}</div>
                    <div className="text-xs text-muted-foreground font-mono">{row.model_id}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.provider}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={row.priority}
                      className="h-8 w-20"
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (v !== row.priority) updatePriority(row, v);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.supports_tools ? (
                      <Badge variant="outline" className="text-xs">sim</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={row.consecutive_failures > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {row.consecutive_failures}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {row.last_health_check_at
                        ? new Date(row.last_health_check_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                      {row.last_health_check_error && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p className="text-xs font-mono break-all">{row.last_health_check_error}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={row.active} onCheckedChange={(v) => toggleActive(row, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => runHealthcheck(row.model_id)}
                      disabled={pinging === row.model_id}
                    >
                      {pinging === row.model_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum modelo cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conectores de LLMs</h2>
          <p className="text-sm text-muted-foreground">
            Fonte única de verdade para modelos OpenRouter consumidos por todas edge functions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCatalogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar modelo
          </Button>
          <Button onClick={() => runHealthcheck()} disabled={pingingAll}>
            {pingingAll ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Healthcheck geral
          </Button>
        </div>
      </div>

      <AddLLMFromCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        alreadyAdded={alreadyAdded}
        onAdded={load}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {renderTable(grouped.free, "Modelos Free")}
          {renderTable(grouped.paid, "Modelos Paid")}
        </>
      )}
    </div>
  );
};

export default AdminLLMsTab;
