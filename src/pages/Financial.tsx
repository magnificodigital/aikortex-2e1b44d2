import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ModuleGate from "@/components/shared/ModuleGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, Search, Download, FileText, Receipt, TrendingUp, TrendingDown, ShoppingCart, Tag, Users, QrCode, RefreshCw, Truck, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FinancialOverview from "@/components/financial/FinancialOverview";
import InvoiceTable from "@/components/financial/InvoiceTable";
import InvoiceDetailDialog from "@/components/financial/InvoiceDetailDialog";
import SubscriptionList from "@/components/financial/SubscriptionList";
import ExpenseTracker from "@/components/financial/ExpenseTracker";
import NewInvoiceDialog from "@/components/financial/NewInvoiceDialog";
import NewExpenseDialog from "@/components/financial/NewExpenseDialog";
import CashFlowView from "@/components/financial/CashFlowView";
import BudgetTracker from "@/components/financial/BudgetTracker";
import TransactionHistory from "@/components/financial/TransactionHistory";
import ProfitLossView from "@/components/financial/ProfitLossView";
import AccountsView from "@/components/financial/AccountsView";
import CostCenterView from "@/components/financial/CostCenterView";
import FinancialReportsView from "@/components/financial/FinancialReportsView";
import QuickSaleDialog from "@/components/financial/QuickSaleDialog";
import { mockInvoices, Invoice } from "@/types/financial";
import { toast } from "@/hooks/use-toast";

const Financial = () => {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [showQuickSale, setShowQuickSale] = useState(false);

  const filteredInvoices = mockInvoices.filter(i =>
    i.client.toLowerCase().includes(search.toLowerCase()) ||
    i.id.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModuleGate moduleKey="gestao.financeiro">
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
              <p className="text-sm text-muted-foreground">Controle suas receitas, despesas e contas</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - dgflow style */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowQuickSale(true)}
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" /> Venda Rápida
          </Button>
          <Button
            onClick={() => setShowNewExpense(true)}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <TrendingDown className="w-4 h-4 mr-2" /> Lançar Despesa
          </Button>
          <Button variant="outline" onClick={() => toast({ title: "Categorias em breve" })}>
            <Tag className="w-4 h-4 mr-2" /> Categorias
          </Button>
        </div>

        {/* Tabs - dgflow style */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="receivable">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Receber
            </TabsTrigger>
            <TabsTrigger value="payable">
              <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> Pagar
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Clientes
            </TabsTrigger>
            <TabsTrigger value="pix">
              <QrCode className="w-3.5 h-3.5 mr-1.5" /> PIX
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Assinaturas
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              <Truck className="w-3.5 h-3.5 mr-1.5" /> Fornecedores
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FinancialOverview />
          </TabsContent>

          <TabsContent value="receivable" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar faturas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <InvoiceTable invoices={filteredInvoices} onView={setSelectedInvoice} />
          </TabsContent>

          <TabsContent value="payable">
            <ExpenseTracker />
          </TabsContent>

          <TabsContent value="clients">
            <AccountsView />
          </TabsContent>

          <TabsContent value="pix">
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionList />
          </TabsContent>

          <TabsContent value="suppliers">
            <CostCenterView />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReportsView />
          </TabsContent>
        </Tabs>

        <InvoiceDetailDialog invoice={selectedInvoice} open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)} />
        <NewInvoiceDialog open={showNewInvoice} onOpenChange={setShowNewInvoice} />
        <NewExpenseDialog open={showNewExpense} onOpenChange={setShowNewExpense} />
        <QuickSaleDialog open={showQuickSale} onOpenChange={setShowQuickSale} />
      </div>
    </DashboardLayout>
    </ModuleGate>
  );
};

export default Financial;
