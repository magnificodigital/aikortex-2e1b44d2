import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, FolderKanban, DollarSign, FileText, UsersRound, Download, Clock, Wand2, Handshake } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportKPIs from "@/components/reports/ReportKPIs";
import RevenueCharts from "@/components/reports/RevenueCharts";
import ProjectTaskCharts from "@/components/reports/ProjectTaskCharts";
import TeamPerformanceCharts from "@/components/reports/TeamPerformanceCharts";
import ClientReports from "@/components/reports/ClientReports";
import ContractReports from "@/components/reports/ContractReports";
import PartnerReports from "@/components/reports/PartnerReports";
import CustomReportBuilder from "@/components/reports/CustomReportBuilder";
import { ExportDialog, ScheduleDialog } from "@/components/reports/ReportExportSchedule";

const Reports = () => {
  const [period, setPeriod] = useState("6m");
  const [exportOpen, setExportOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatórios & Analytics</h1>
              <p className="text-sm text-muted-foreground">Insights da operação completa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Último mês</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setScheduleOpen(true)}>
              <Clock className="w-3.5 h-3.5" />
              Agendar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
              <Download className="w-3.5 h-3.5" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-6">
          <ReportKPIs />
        </div>

        {/* Tabbed Reports */}
        <Tabs defaultValue="financeiro" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="financeiro" className="gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="projetos" className="gap-1.5 text-xs">
              <FolderKanban className="w-3.5 h-3.5" />
              Projetos & Tarefas
            </TabsTrigger>
            <TabsTrigger value="equipe" className="gap-1.5 text-xs">
              <UsersRound className="w-3.5 h-3.5" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="contratos" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="parceiros" className="gap-1.5 text-xs">
              <Handshake className="w-3.5 h-3.5" />
              Parceiros
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5 text-xs">
              <Wand2 className="w-3.5 h-3.5" />
              Personalizado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro">
            <RevenueCharts />
          </TabsContent>
          <TabsContent value="projetos">
            <ProjectTaskCharts />
          </TabsContent>
          <TabsContent value="equipe">
            <TeamPerformanceCharts />
          </TabsContent>
          <TabsContent value="clientes">
            <ClientReports />
          </TabsContent>
          <TabsContent value="contratos">
            <ContractReports />
          </TabsContent>
          <TabsContent value="parceiros">
            <PartnerReports />
          </TabsContent>
          <TabsContent value="custom">
            <CustomReportBuilder />
          </TabsContent>
        </Tabs>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </DashboardLayout>
  );
};

export default Reports;
