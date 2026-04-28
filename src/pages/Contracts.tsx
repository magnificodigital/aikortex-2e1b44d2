import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import ContractMetrics from "@/components/contracts/ContractMetrics";
import ContractTable from "@/components/contracts/ContractTable";
import ContractDetailDialog from "@/components/contracts/ContractDetailDialog";
import ContractFilters from "@/components/contracts/ContractFilters";
import ContractCharts from "@/components/contracts/ContractCharts";
import NewContractDialog from "@/components/contracts/NewContractDialog";
import EditContractDialog from "@/components/contracts/EditContractDialog";
import SignatureDialog from "@/components/contracts/SignatureDialog";
import { mockContracts, Contract } from "@/types/contract";

const Contracts = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = mockContracts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.client.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <ModuleGate moduleKey="gestao.contratos">
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
              <p className="text-sm text-muted-foreground">Gestão contratual da agência</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1" /> Novo Contrato
          </Button>
        </div>

        <ContractMetrics />

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ContractFilters
              search={search} onSearchChange={setSearch}
              statusFilter={statusFilter} onStatusChange={setStatusFilter}
              typeFilter={typeFilter} onTypeChange={setTypeFilter}
            />
            <ContractTable contracts={filtered} onView={setSelectedContract} onEdit={setEditingContract} onSign={setSigningContract} />
          </TabsContent>

          <TabsContent value="analytics">
            <ContractCharts />
          </TabsContent>
        </Tabs>

        <ContractDetailDialog contract={selectedContract} open={!!selectedContract} onOpenChange={o => !o && setSelectedContract(null)} />
        <EditContractDialog contract={editingContract} open={!!editingContract} onOpenChange={o => !o && setEditingContract(null)} />
        <NewContractDialog open={showNew} onOpenChange={setShowNew} />
        <SignatureDialog contract={signingContract} open={!!signingContract} onOpenChange={o => !o && setSigningContract(null)} />
      </div>
    </DashboardLayout>
    </ModuleGate>
  );
};

export default Contracts;
