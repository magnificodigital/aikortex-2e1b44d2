import { useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

const SECTION_LABELS: { match: RegExp; label: string }[] = [
  { match: /^\/aikortex\/agents/, label: "Agentes" },
  { match: /^\/aikortex\/automations/, label: "Automações" },
  { match: /^\/aikortex\/messages/, label: "Mensagens" },
  { match: /^\/aikortex\/broadcasts/, label: "Disparos" },
  { match: /^\/aikortex\/crm/, label: "CRM" },
  { match: /^\/aikortex/, label: "Aikortex" },
  { match: /^\/apps/, label: "Apps" },
  { match: /^\/app-builder/, label: "App Builder" },
  { match: /^\/agent-builder/, label: "Agent Builder" },
  { match: /^\/templates/, label: "Templates" },
  { match: /^\/clients/, label: "Clientes" },
  { match: /^\/projects/, label: "Projetos" },
  { match: /^\/tasks/, label: "Tarefas" },
  { match: /^\/team/, label: "Equipe" },
  { match: /^\/financial|^\/financeiro/, label: "Financeiro" },
  { match: /^\/contracts/, label: "Contratos" },
  { match: /^\/reports/, label: "Relatórios" },
  { match: /^\/partners/, label: "Parceiros" },
  { match: /^\/sales/, label: "Vendas" },
  { match: /^\/meetings/, label: "Reuniões" },
  { match: /^\/calls/, label: "Chamadas" },
  { match: /^\/home/, label: "Spark" },
  { match: /^\/dashboard/, label: "Dashboard" },
];

function useSectionLabel() {
  const { pathname } = useLocation();
  return SECTION_LABELS.find((s) => s.match.test(pathname))?.label ?? null;
}

export function WorkspaceHeader({ mobileMenuButton }: { mobileMenuButton?: React.ReactNode }) {
  const section = useSectionLabel();

  return (
    <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border/40 bg-background/70 px-3 backdrop-blur-lg">
      {mobileMenuButton}
      <WorkspaceSwitcher />
      {section && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm font-medium text-muted-foreground">{section}</span>
        </>
      )}
    </div>
  );
}

export default WorkspaceHeader;
