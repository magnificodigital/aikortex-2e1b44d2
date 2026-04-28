import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, DollarSign, Users, Target } from "lucide-react";

const salesData = [
  { id: 1, client: "Tech Solutions", value: 15000, stage: "Proposta", probability: 70, date: "2026-03-10" },
  { id: 2, client: "Marketing Pro", value: 8500, stage: "Negociação", probability: 85, date: "2026-03-08" },
  { id: 3, client: "E-commerce Plus", value: 22000, stage: "Qualificação", probability: 40, date: "2026-03-12" },
  { id: 4, client: "StartupXYZ", value: 5000, stage: "Fechado", probability: 100, date: "2026-03-05" },
  { id: 5, client: "Consultoria ABC", value: 12000, stage: "Proposta", probability: 60, date: "2026-03-11" },
];

const stageColors: Record<string, string> = {
  Qualificação: "bg-amber-500/10 text-amber-500",
  Proposta: "bg-blue-500/10 text-blue-500",
  Negociação: "bg-purple-500/10 text-purple-500",
  Fechado: "bg-emerald-500/10 text-emerald-500",
};

const Sales = () => {
  const totalPipeline = salesData.reduce((s, d) => s + d.value, 0);
  const totalClosed = salesData.filter((d) => d.stage === "Fechado").reduce((s, d) => s + d.value, 0);
  const avgDeal = Math.round(totalPipeline / salesData.length);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
              <p className="text-sm text-muted-foreground">Pipeline e oportunidades da agência</p>
            </div>
          </div>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Nova Oportunidade
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline Total</p>
                  <p className="text-xl font-bold text-foreground">R$ {totalPipeline.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fechados</p>
                  <p className="text-xl font-bold text-foreground">R$ {totalClosed.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-xl font-bold text-foreground">R$ {avgDeal.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Oportunidades</p>
                  <p className="text-xl font-bold text-foreground">{salesData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Estágio</th>
                    <th className="pb-3 font-medium">Probabilidade</th>
                    <th className="pb-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {salesData.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/40 transition-colors cursor-pointer">
                      <td className="py-3 font-medium text-foreground">{sale.client}</td>
                      <td className="py-3 text-foreground">R$ {sale.value.toLocaleString()}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={`border-0 text-xs ${stageColors[sale.stage] || ""}`}>
                          {sale.stage}
                        </Badge>
                      </td>
                      <td className="py-3 text-foreground">{sale.probability}%</td>
                      <td className="py-3 text-muted-foreground">{sale.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Sales;
