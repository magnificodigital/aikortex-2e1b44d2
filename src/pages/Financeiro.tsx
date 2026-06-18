import DashboardLayout from "@/components/DashboardLayout";
import FinancialPanel from "@/components/dashboard/FinancialPanel";

// Página standalone (acessível por URL direta). O conteúdo real vive em
// components/dashboard/FinancialPanel, reutilizado pelo /dashboard principal.
const Financeiro = () => (
  <DashboardLayout>
    <div className="p-6 lg:p-8 max-w-7xl">
      <FinancialPanel />
    </div>
  </DashboardLayout>
);

export default Financeiro;
