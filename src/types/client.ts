export type ClientStatus = "active" | "onboarding" | "inactive";

export interface ClientTag {
  id: string;
  label: string;
  color: string;
}

export interface ClientContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  companySize: string;
  status: ClientStatus;
  accountManager: string;
  initials: string;
  since: string;
  logo?: string;
  socialMedia: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  tags: ClientTag[];
  healthScore: number;
  projects: number;
  tasks: number;
  agents: number;
  automations: number;
  revenue: string;
  leads: number;
}

export interface TimelineEvent {
  id: string;
  type: "task" | "message" | "automation" | "call" | "lead" | "contract" | "payment";
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30" },
  onboarding: { label: "Onboarding", className: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30" },
  inactive: { label: "Inativo", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const MOCK_CLIENTS: Client[] = [
  {
    id: "1", companyName: "TechCorp", contactName: "Carlos Mendes", email: "carlos@techcorp.com", phone: "(11) 99999-0001",
    website: "techcorp.com", industry: "Tecnologia", companySize: "50-100", status: "active", accountManager: "Maria Silva",
    initials: "TC", since: "Jan 2024", socialMedia: { linkedin: "techcorp", instagram: "@techcorp" },
    tags: [{ id: "1", label: "Enterprise", color: "primary" }, { id: "2", label: "Alta Prioridade", color: "destructive" }],
    healthScore: 92, projects: 3, tasks: 12, agents: 2, automations: 5, revenue: "R$ 12.500", leads: 45,
  },
  {
    id: "2", companyName: "SalesUp", contactName: "Ana Beatriz", email: "ana@salesup.com.br", phone: "(11) 99999-0002",
    website: "salesup.com.br", industry: "Vendas", companySize: "10-50", status: "active", accountManager: "João Costa",
    initials: "SU", since: "Mar 2024", socialMedia: { linkedin: "salesup", instagram: "@salesup" },
    tags: [{ id: "3", label: "Growth", color: "primary" }],
    healthScore: 78, projects: 2, tasks: 8, agents: 1, automations: 3, revenue: "R$ 8.900", leads: 32,
  },
  {
    id: "3", companyName: "DataViz", contactName: "Ricardo Lima", email: "ricardo@dataviz.io", phone: "(21) 99999-0003",
    website: "dataviz.io", industry: "Analytics", companySize: "100-500", status: "active", accountManager: "Maria Silva",
    initials: "DV", since: "Nov 2023", socialMedia: { linkedin: "dataviz" },
    tags: [{ id: "1", label: "Enterprise", color: "primary" }, { id: "4", label: "Parceiro", color: "secondary" }],
    healthScore: 95, projects: 4, tasks: 18, agents: 3, automations: 8, revenue: "R$ 22.000", leads: 67,
  },
  {
    id: "4", companyName: "HealthPlus", contactName: "Fernanda Costa", email: "fernanda@healthplus.com", phone: "(31) 99999-0004",
    website: "healthplus.com", industry: "Saúde", companySize: "10-50", status: "inactive", accountManager: "João Costa",
    initials: "HP", since: "Jun 2024", socialMedia: {},
    tags: [{ id: "5", label: "Básico", color: "muted" }],
    healthScore: 35, projects: 1, tasks: 2, agents: 0, automations: 1, revenue: "R$ 3.200", leads: 5,
  },
  {
    id: "5", companyName: "FinanceAI", contactName: "Pedro Almeida", email: "pedro@financeai.com", phone: "(11) 99999-0005",
    website: "financeai.com", industry: "Finanças", companySize: "50-100", status: "active", accountManager: "Maria Silva",
    initials: "FA", since: "Fev 2024", socialMedia: { linkedin: "financeai", instagram: "@financeai" },
    tags: [{ id: "1", label: "Enterprise", color: "primary" }, { id: "2", label: "Alta Prioridade", color: "destructive" }],
    healthScore: 88, projects: 2, tasks: 14, agents: 4, automations: 12, revenue: "R$ 18.700", leads: 89,
  },
  {
    id: "6", companyName: "EduTech", contactName: "Juliana Ferreira", email: "juliana@edutech.com.br", phone: "(41) 99999-0006",
    website: "edutech.com.br", industry: "Educação", companySize: "10-50", status: "onboarding", accountManager: "João Costa",
    initials: "ET", since: "Mar 2025", socialMedia: { instagram: "@edutech" },
    tags: [{ id: "3", label: "Growth", color: "primary" }],
    healthScore: 60, projects: 0, tasks: 3, agents: 0, automations: 0, revenue: "R$ 0", leads: 0,
  },
  {
    id: "7", companyName: "RetailMax", contactName: "Marcos Oliveira", email: "marcos@retailmax.com", phone: "(11) 99999-0007",
    website: "retailmax.com", industry: "Varejo", companySize: "500+", status: "active", accountManager: "Maria Silva",
    initials: "RM", since: "Dez 2023", socialMedia: { linkedin: "retailmax", instagram: "@retailmax", facebook: "retailmax" },
    tags: [{ id: "1", label: "Enterprise", color: "primary" }, { id: "4", label: "Parceiro", color: "secondary" }],
    healthScore: 85, projects: 5, tasks: 22, agents: 2, automations: 7, revenue: "R$ 15.300", leads: 54,
  },
  {
    id: "8", companyName: "LogiFlow", contactName: "Luciana Santos", email: "luciana@logiflow.com", phone: "(51) 99999-0008",
    website: "logiflow.com", industry: "Logística", companySize: "50-100", status: "active", accountManager: "João Costa",
    initials: "LF", since: "Mai 2024", socialMedia: { linkedin: "logiflow" },
    tags: [{ id: "5", label: "Básico", color: "muted" }],
    healthScore: 72, projects: 1, tasks: 5, agents: 1, automations: 2, revenue: "R$ 6.400", leads: 18,
  },
];

export const MOCK_TIMELINE: TimelineEvent[] = [
  { id: "1", type: "task", title: "Tarefa criada", description: "Configurar automação de email marketing", timestamp: "Hoje, 14:30" },
  { id: "2", type: "message", title: "Mensagem enviada", description: "Relatório mensal enviado ao cliente", timestamp: "Hoje, 11:00" },
  { id: "3", type: "automation", title: "Automação disparada", description: "Fluxo de onboarding executado com sucesso", timestamp: "Ontem, 18:45" },
  { id: "4", type: "call", title: "Chamada realizada", description: "Agente IA atendeu chamada de suporte", timestamp: "Ontem, 15:20" },
  { id: "5", type: "lead", title: "Novo lead capturado", description: "Lead via formulário do site - João Silva", timestamp: "Ontem, 10:00" },
  { id: "6", type: "contract", title: "Contrato assinado", description: "Contrato de serviço anual renovado", timestamp: "5 Mar, 09:00" },
  { id: "7", type: "payment", title: "Pagamento recebido", description: "Fatura #2024-042 paga - R$ 4.500", timestamp: "3 Mar, 16:30" },
];
