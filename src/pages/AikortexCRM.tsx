import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import CRMKanban from "@/components/crm/CRMKanban";
import LeadDetailDialog from "@/components/crm/LeadDetailDialog";
import NewLeadDialog from "@/components/crm/NewLeadDialog";
import { Lead, MOCK_LEADS, PipelineStage, PIPELINE_STAGES, LEAD_SOURCES, TEMPERATURE_CONFIG } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Contact, Plus, Search, Users, TrendingUp, DollarSign, BarChart3, LayoutGrid, List, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AikortexCRM = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterTemp, setFilterTemp] = useState<string>("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === "all" || l.source === filterSource;
    const matchesTemp = filterTemp === "all" || l.temperature === filterTemp;
    return matchesSearch && matchesSource && matchesTemp;
  });

  const activeLeads = leads.filter((l) => !["ganho", "perdido"].includes(l.stage));
  const totalPipeline = activeLeads.reduce((sum, l) => sum + l.value, 0);
  const wonLeads = leads.filter((l) => l.stage === "ganho");
  const wonValue = wonLeads.reduce((sum, l) => sum + l.value, 0);
  const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

  const handleStageChange = (leadId: string, newStage: PipelineStage) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              stage: newStage,
              updatedAt: new Date().toISOString(),
              activities: [
                ...l.activities,
                {
                  id: `act-${Date.now()}`,
                  type: "stage_change" as const,
                  description: `Movido para ${PIPELINE_STAGES.find((s) => s.value === newStage)?.label}`,
                  createdAt: new Date().toISOString(),
                  createdBy: "Você",
                },
              ],
            }
          : l
      )
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => prev ? { ...prev, stage: newStage } : null);
    }
  };

  const handleAddActivity = (leadId: string, activity: { type: string; description: string }) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              updatedAt: new Date().toISOString(),
              activities: [
                ...l.activities,
                { id: `act-${Date.now()}`, type: activity.type as any, description: activity.description, createdAt: new Date().toISOString(), createdBy: "Você" },
              ],
            }
          : l
      )
    );
  };

  const handleNewLead = (data: Omit<Lead, "id" | "activities" | "createdAt" | "updatedAt">) => {
    const newLead: Lead = {
      ...data,
      id: `lead-${Date.now()}`,
      activities: [{ id: `act-${Date.now()}`, type: "note", description: "Lead criado manualmente", createdAt: new Date().toISOString(), createdBy: "Você" }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLeads((prev) => [newLead, ...prev]);
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  return (
    <ModuleGate moduleKey="gestao.crm">
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Contact className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CRM</h1>
              <p className="text-xs text-muted-foreground">Pipeline de leads e oportunidades</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setNewLeadOpen(true)}>
            <Plus className="w-4 h-4" /> Novo Lead
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Leads ativos", value: activeLeads.length.toString(), icon: Users, color: "text-primary" },
            { label: "Pipeline total", value: `R$ ${(totalPipeline / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-success" },
            { label: "Deals ganhos", value: `R$ ${(wonValue / 1000).toFixed(0)}k`, icon: TrendingUp, color: "text-info" },
            { label: "Conversão", value: `${conversionRate}%`, icon: BarChart3, color: "text-warning" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <m.icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-[11px] font-medium">{m.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTemp} onValueChange={setFilterTemp}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Temperatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="frio">❄️ Frio</SelectItem>
              <SelectItem value="morno">🌤️ Morno</SelectItem>
              <SelectItem value="quente">🔥 Quente</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant={view === "kanban" ? "default" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setView("kanban")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setView("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {view === "kanban" ? (
          <CRMKanban leads={filteredLeads} onLeadClick={openLeadDetail} onStageChange={handleStageChange} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const stageCfg = PIPELINE_STAGES.find((s) => s.value === lead.stage)!;
                  const tempCfg = TEMPERATURE_CONFIG[lead.temperature];
                  const source = LEAD_SOURCES.find((s) => s.value === lead.source);
                  return (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLeadDetail(lead)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {lead.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{lead.name}</p>
                            <p className="text-[10px] text-muted-foreground">{lead.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{lead.company}</TableCell>
                      <TableCell>
                        <Badge className={`${stageCfg.color} ${stageCfg.bg} border-0 text-[10px]`}>{stageCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${tempCfg.color} ${tempCfg.bg} border-0 text-[10px]`}>{tempCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">R$ {lead.value.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-sm">{source?.icon} {source?.label}</TableCell>
                      <TableCell className="text-sm">{lead.assignee}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <LeadDetailDialog
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStageChange={handleStageChange}
        onAddActivity={handleAddActivity}
      />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onSave={handleNewLead} />
    </DashboardLayout>
    </ModuleGate>
  );
};

export default AikortexCRM;
