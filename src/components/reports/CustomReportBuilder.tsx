import { useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Save, RotateCcw, BarChart3, PieChartIcon, TrendingUp, Table2 } from "lucide-react";
import { MOCK_CLIENTS } from "@/types/client";
import { mockTaskEngine, getProjects } from "@/types/task-engine";
import { mockInvoices, mockExpenses, mockSubscriptions } from "@/types/financial";
import { mockContracts } from "@/types/contract";
import { mockTeamMembers } from "@/types/team";

type DataSourceKey = "clients" | "projects" | "tasks" | "invoices" | "expenses" | "contracts" | "team" | "subscriptions";
type VizType = "bar" | "line" | "area" | "pie" | "table";

interface MetricOption {
  key: string;
  label: string;
  source: DataSourceKey;
}

const DATA_SOURCES: { key: DataSourceKey; label: string }[] = [
  { key: "clients", label: "Clientes" },
  { key: "projects", label: "Projetos" },
  { key: "tasks", label: "Tarefas" },
  { key: "invoices", label: "Faturas" },
  { key: "expenses", label: "Despesas" },
  { key: "contracts", label: "Contratos" },
  { key: "team", label: "Equipe" },
  { key: "subscriptions", label: "Assinaturas" },
];

const METRICS: MetricOption[] = [
  { key: "client_count", label: "Qtd. Clientes", source: "clients" },
  { key: "client_revenue", label: "Receita por Cliente", source: "clients" },
  { key: "client_health", label: "Health Score", source: "clients" },
  { key: "project_count", label: "Qtd. Projetos", source: "projects" },
  { key: "project_progress", label: "Progresso Projetos", source: "projects" },
  { key: "task_status", label: "Status das Tarefas", source: "tasks" },
  { key: "task_priority", label: "Prioridade das Tarefas", source: "tasks" },
  { key: "invoice_amount", label: "Valor Faturas", source: "invoices" },
  { key: "invoice_status", label: "Status Faturas", source: "invoices" },
  { key: "expense_category", label: "Despesas por Categoria", source: "expenses" },
  { key: "expense_amount", label: "Valor Despesas", source: "expenses" },
  { key: "contract_status", label: "Status Contratos", source: "contracts" },
  { key: "contract_value", label: "Valor Contratos", source: "contracts" },
  { key: "team_workload", label: "Carga de Trabalho", source: "team" },
  { key: "team_performance", label: "Performance Equipe", source: "team" },
  { key: "sub_mrr", label: "MRR", source: "subscriptions" },
];

const VIZ_OPTIONS: { key: VizType; label: string; icon: typeof BarChart3 }[] = [
  { key: "bar", label: "Barras", icon: BarChart3 },
  { key: "line", label: "Linha", icon: TrendingUp },
  { key: "area", label: "Área", icon: TrendingUp },
  { key: "pie", label: "Pizza", icon: PieChartIcon },
  { key: "table", label: "Tabela", icon: Table2 },
];

const COLORS = [
  "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(270, 70%, 55%)", "hsl(199, 89%, 48%)", "hsl(0, 72%, 51%)",
];

function generateData(metric: string): { data: { name: string; value: number }[]; label: string } {
  switch (metric) {
    case "client_count":
      return {
        label: "Clientes",
        data: [
          { name: "Ativo", value: MOCK_CLIENTS.filter(c => c.status === "active").length },
          { name: "Onboarding", value: MOCK_CLIENTS.filter(c => c.status === "onboarding").length },
          { name: "Inativo", value: MOCK_CLIENTS.filter(c => c.status === "inactive").length },
        ],
      };
    case "client_revenue":
      return {
        label: "Receita",
        data: MOCK_CLIENTS.slice(0, 6).map(c => ({
          name: c.companyName.slice(0, 10),
          value: parseInt(c.revenue.replace(/[^\d]/g, "")) || 0,
        })),
      };
    case "client_health":
      return {
        label: "Health Score",
        data: MOCK_CLIENTS.map(c => ({ name: c.companyName.slice(0, 10), value: c.healthScore })),
      };
    case "project_count": {
      const projects = getProjects(mockTaskEngine);
      return {
        label: "Projetos",
        data: [
          { name: "Em Progresso", value: projects.filter(p => p.status === "in_progress").length },
          { name: "Planejado", value: projects.filter(p => p.status === "planned").length },
          { name: "Concluído", value: projects.filter(p => p.status === "completed").length },
        ],
      };
    }
    case "project_progress": {
      const projects = getProjects(mockTaskEngine);
      return {
        label: "Progresso",
        data: projects.map(p => ({ name: p.title.slice(0, 12), value: p.progress })),
      };
    }
    case "task_status": {
      const tasks = mockTaskEngine.filter(i => i.task_type === "task");
      const statusMap: Record<string, number> = {};
      tasks.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
      return {
        label: "Tarefas",
        data: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      };
    }
    case "task_priority": {
      const tasks = mockTaskEngine.filter(i => i.task_type === "task");
      const prioMap: Record<string, number> = {};
      tasks.forEach(t => { prioMap[t.priority] = (prioMap[t.priority] || 0) + 1; });
      return {
        label: "Tarefas",
        data: Object.entries(prioMap).map(([name, value]) => ({ name, value })),
      };
    }
    case "invoice_amount":
      return {
        label: "Valor",
        data: mockInvoices.slice(0, 6).map(i => ({ name: i.client.slice(0, 10), value: i.amount })),
      };
    case "invoice_status": {
      const statusMap: Record<string, number> = {};
      mockInvoices.forEach(i => { statusMap[i.status] = (statusMap[i.status] || 0) + 1; });
      return {
        label: "Faturas",
        data: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      };
    }
    case "expense_category": {
      const catMap: Record<string, number> = {};
      mockExpenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
      return {
        label: "Despesas",
        data: Object.entries(catMap).map(([name, value]) => ({ name, value })),
      };
    }
    case "expense_amount":
      return {
        label: "Valor",
        data: mockExpenses.slice(0, 6).map(e => ({ name: e.description.slice(0, 12), value: e.amount })),
      };
    case "contract_status": {
      const statusMap: Record<string, number> = {};
      mockContracts.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
      return {
        label: "Contratos",
        data: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      };
    }
    case "contract_value":
      return {
        label: "Valor",
        data: mockContracts.slice(0, 6).map(c => ({ name: c.client.slice(0, 10), value: c.value })),
      };
    case "team_workload":
      return {
        label: "Tarefas",
        data: mockTeamMembers.filter(m => m.status === "active").map(m => ({
          name: m.fullName.split(" ")[0],
          value: m.assignedTasks,
        })),
      };
    case "team_performance":
      return {
        label: "Concluídas",
        data: mockTeamMembers.filter(m => m.status === "active").map(m => ({
          name: m.fullName.split(" ")[0],
          value: m.completedTasks,
        })),
      };
    case "sub_mrr":
      return {
        label: "MRR",
        data: mockSubscriptions.filter(s => s.status === "active").map(s => ({
          name: s.client.slice(0, 10),
          value: s.amount,
        })),
      };
    default:
      return { label: "Dados", data: [] };
  }
}

const CustomReportBuilder = () => {
  const [selectedSources, setSelectedSources] = useState<DataSourceKey[]>(["clients"]);
  const [selectedMetric, setSelectedMetric] = useState("client_count");
  const [vizType, setVizType] = useState<VizType>("bar");
  const [reportName, setReportName] = useState("");
  const [generated, setGenerated] = useState(false);

  const availableMetrics = METRICS.filter(m => selectedSources.includes(m.source));
  const { data, label } = generateData(selectedMetric);

  const toggleSource = (source: DataSourceKey) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleGenerate = () => {
    setGenerated(true);
  };

  const handleReset = () => {
    setSelectedSources(["clients"]);
    setSelectedMetric("client_count");
    setVizType("bar");
    setReportName("");
    setGenerated(false);
  };

  const renderChart = () => {
    if (!data.length) return <p className="text-muted-foreground text-sm text-center py-12">Sem dados para exibir</p>;

    if (vizType === "table") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium text-xs">Item</th>
                <th className="text-right py-2 text-muted-foreground font-medium text-xs">{label}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2.5 text-foreground">{d.name}</td>
                  <td className="text-right py-2.5 font-medium">{d.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (vizType === "pie") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (vizType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
            <Tooltip />
            <Line type="monotone" dataKey="value" name={label} stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (vizType === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="grad-custom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
            <Tooltip />
            <Area type="monotone" dataKey="value" name={label} stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#grad-custom)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
          <Tooltip />
          <Bar dataKey="value" name={label} fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config Panel */}
        <div className="glass-card rounded-xl p-5 space-y-5">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do Relatório</Label>
            <Input
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              placeholder="Meu relatório personalizado..."
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Fontes de Dados</Label>
            <div className="flex flex-wrap gap-2">
              {DATA_SOURCES.map(ds => (
                <label key={ds.key} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedSources.includes(ds.key)}
                    onCheckedChange={() => toggleSource(ds.key)}
                  />
                  <span className="text-xs">{ds.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Métrica</Label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecionar métrica" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.length === 0 && (
                  <SelectItem value="_none" disabled>Selecione uma fonte primeiro</SelectItem>
                )}
                {availableMetrics.map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Visualização</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {VIZ_OPTIONS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setVizType(v.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                    vizType === v.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <v.icon className="w-4 h-4" />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleGenerate} size="sm" className="flex-1 gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Gerar
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {reportName || "Relatório Personalizado"}
            </h3>
            <div className="flex gap-1.5">
              {selectedSources.map(s => (
                <Badge key={s} variant="secondary" className="text-[10px]">
                  {DATA_SOURCES.find(ds => ds.key === s)?.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="h-72">
            {generated ? renderChart() : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center space-y-2">
                  <BarChart3 className="w-10 h-10 mx-auto opacity-30" />
                  <p>Configure as opções e clique em <strong>Gerar</strong></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
