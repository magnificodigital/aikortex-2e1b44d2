export type ContractStatus = "draft" | "pending_signature" | "active" | "expired" | "cancelled";
export type ContractType = "monthly_service" | "saas_subscription" | "implementation" | "consulting" | "custom";

export interface Contract {
  id: string;
  name: string;
  client: string;
  clientId: string;
  type: ContractType;
  value: number;
  frequency: "monthly" | "quarterly" | "yearly" | "one-time";
  startDate: string;
  endDate: string;
  status: ContractStatus;
  services: string[];
  signedDate?: string;
  signedBy?: string;
  attachments: number;
  notes?: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: ContractType;
  description: string;
  defaultValue: number;
  defaultDuration: number; // months
  services: string[];
}

export const contractStatusConfig: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  pending_signature: { label: "Aguardando Assinatura", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  active: { label: "Ativo", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  expired: { label: "Expirado", color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

export const contractTypeConfig: Record<ContractType, { label: string }> = {
  monthly_service: { label: "Serviço Mensal" },
  saas_subscription: { label: "Assinatura SaaS" },
  implementation: { label: "Implementação" },
  consulting: { label: "Consultoria" },
  custom: { label: "Personalizado" },
};

export const frequencyLabels: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  "one-time": "Único",
};

export const mockTemplates: ContractTemplate[] = [
  { id: "t1", name: "Automação IA", type: "monthly_service", description: "Contrato de automação com agentes IA", defaultValue: 5000, defaultDuration: 12, services: ["Automação", "Agentes IA", "Suporte"] },
  { id: "t2", name: "Implementação CRM", type: "implementation", description: "Projeto de implementação de CRM", defaultValue: 15000, defaultDuration: 3, services: ["CRM", "Integração", "Treinamento"] },
  { id: "t3", name: "Marketing Digital", type: "monthly_service", description: "Gestão de tráfego e performance", defaultValue: 4000, defaultDuration: 6, services: ["Tráfego Pago", "SEO", "Analytics"] },
  { id: "t4", name: "Assinatura Plataforma", type: "saas_subscription", description: "Acesso à plataforma SaaS", defaultValue: 2500, defaultDuration: 12, services: ["Plataforma", "Suporte", "Atualizações"] },
  { id: "t5", name: "Consultoria Estratégica", type: "consulting", description: "Consultoria em transformação digital", defaultValue: 12000, defaultDuration: 3, services: ["Consultoria", "Roadmap", "Workshops"] },
];

export const mockContracts: Contract[] = [
  { id: "CTR-001", name: "Automação IA - TechFlow", client: "TechFlow Corp", clientId: "c1", type: "monthly_service", value: 8500, frequency: "monthly", startDate: "2024-06-01", endDate: "2025-06-01", status: "active", services: ["Automação", "Agentes IA", "Suporte"], signedDate: "2024-05-28", signedBy: "Carlos Silva", attachments: 3 },
  { id: "CTR-002", name: "Gestão de Tráfego - Nova Digital", client: "Nova Digital", clientId: "c2", type: "monthly_service", value: 4200, frequency: "monthly", startDate: "2024-09-01", endDate: "2025-09-01", status: "active", services: ["Tráfego Pago", "SEO", "Analytics"], signedDate: "2024-08-25", signedBy: "Ana Martins", attachments: 2 },
  { id: "CTR-003", name: "Plataforma Web + IA - Startup Hub", client: "Startup Hub", clientId: "c3", type: "implementation", value: 35000, frequency: "one-time", startDate: "2025-01-15", endDate: "2025-04-15", status: "active", services: ["Desenvolvimento Web", "Agente IA", "Deploy"], signedDate: "2025-01-10", signedBy: "Rafael Costa", attachments: 5 },
  { id: "CTR-004", name: "Chatbot + CRM - MegaStore", client: "MegaStore", clientId: "c4", type: "monthly_service", value: 6800, frequency: "monthly", startDate: "2024-11-01", endDate: "2025-11-01", status: "active", services: ["Chatbot IA", "CRM", "Integrações"], signedDate: "2024-10-28", signedBy: "Fernanda Lima", attachments: 2 },
  { id: "CTR-005", name: "Consultoria IA - Fintech Plus", client: "Fintech Plus", clientId: "c5", type: "consulting", value: 15000, frequency: "quarterly", startDate: "2025-01-01", endDate: "2025-12-31", status: "active", services: ["Consultoria", "Roadmap", "Workshops"], signedDate: "2024-12-20", signedBy: "Marcos Almeida", attachments: 4 },
  { id: "CTR-006", name: "E-learning Platform - EduTech", client: "EduTech", clientId: "c6", type: "implementation", value: 28000, frequency: "one-time", startDate: "2025-03-01", endDate: "2025-06-30", status: "pending_signature", services: ["Plataforma", "Conteúdo IA", "Deploy"], attachments: 1 },
  { id: "CTR-007", name: "Voice Agent - HealthCare AI", client: "HealthCare AI", clientId: "c7", type: "monthly_service", value: 3200, frequency: "monthly", startDate: "2024-08-01", endDate: "2025-02-01", status: "expired", services: ["Voice Agent", "Suporte"], signedDate: "2024-07-28", signedBy: "Patrícia Souza", attachments: 2 },
  { id: "CTR-008", name: "Assinatura SaaS - DataVision", client: "DataVision", clientId: "c8", type: "saas_subscription", value: 2500, frequency: "monthly", startDate: "2025-02-01", endDate: "2026-02-01", status: "draft", services: ["Plataforma", "API", "Suporte"], attachments: 0 },
];
