export type ProjectStatus = "planning" | "active" | "paused" | "completed";

export interface ProjectTask {
  id: string;
  title: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "review" | "done";
  dueDate: string;
  group: string;
}

export interface ProjectDeliverable {
  id: string;
  title: string;
  type: "campaign" | "automation" | "ai_agent" | "website" | "saas";
  status: "pending" | "in_progress" | "delivered" | "approved";
  dueDate: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  clientId: string;
  description: string;
  manager: string;
  team: string[];
  startDate: string;
  deadline: string;
  status: ProjectStatus;
  progress: number;
  tasks: ProjectTask[];
  deliverables: ProjectDeliverable[];
  template?: string;
}

export const projectTemplates = [
  { id: "crm", name: "Implementação CRM", icon: "Users" },
  { id: "automation", name: "Setup de Automação", icon: "Zap" },
  { id: "ai_agent", name: "Deploy de Agente IA", icon: "Bot" },
  { id: "website", name: "Desenvolvimento Web", icon: "Globe" },
  { id: "campaign", name: "Campanha de Marketing", icon: "Megaphone" },
];

export const mockProjects: Project[] = [
  {
    id: "1",
    name: "Automação de Vendas",
    client: "TechCorp Brasil",
    clientId: "c1",
    description: "Implementação completa de automação do funil de vendas com IA",
    manager: "Ana Silva",
    team: ["Carlos Mendes", "Julia Santos", "Rafael Lima"],
    startDate: "2025-01-15",
    deadline: "2025-04-30",
    status: "active",
    progress: 65,
    tasks: [
      { id: "t1", title: "Mapear funil atual", assignee: "Carlos Mendes", priority: "high", status: "done", dueDate: "2025-02-01", group: "Planejamento" },
      { id: "t2", title: "Configurar CRM", assignee: "Julia Santos", priority: "high", status: "done", dueDate: "2025-02-15", group: "Implementação" },
      { id: "t3", title: "Integrar chatbot IA", assignee: "Rafael Lima", priority: "urgent", status: "in_progress", dueDate: "2025-03-10", group: "Implementação" },
      { id: "t4", title: "Criar fluxos de email", assignee: "Carlos Mendes", priority: "medium", status: "in_progress", dueDate: "2025-03-20", group: "Automação" },
      { id: "t5", title: "Testes A/B", assignee: "Julia Santos", priority: "medium", status: "todo", dueDate: "2025-04-01", group: "Testes" },
      { id: "t6", title: "Deploy e monitoramento", assignee: "Ana Silva", priority: "high", status: "todo", dueDate: "2025-04-15", group: "Deploy" },
    ],
    deliverables: [
      { id: "d1", title: "Funil automatizado", type: "automation", status: "in_progress", dueDate: "2025-03-30" },
      { id: "d2", title: "Chatbot de vendas", type: "ai_agent", status: "pending", dueDate: "2025-04-15" },
    ],
  },
  {
    id: "2",
    name: "Website Institucional",
    client: "Saúde Plus",
    clientId: "c2",
    description: "Redesign completo do site institucional com integração de agendamento",
    manager: "Bruno Costa",
    team: ["Fernanda Rocha", "Diego Alves"],
    startDate: "2025-02-01",
    deadline: "2025-05-15",
    status: "active",
    progress: 40,
    tasks: [
      { id: "t7", title: "Wireframes", assignee: "Fernanda Rocha", priority: "high", status: "done", dueDate: "2025-02-20", group: "Design" },
      { id: "t8", title: "Design UI/UX", assignee: "Fernanda Rocha", priority: "high", status: "in_progress", dueDate: "2025-03-10", group: "Design" },
      { id: "t9", title: "Desenvolvimento front-end", assignee: "Diego Alves", priority: "medium", status: "todo", dueDate: "2025-04-01", group: "Desenvolvimento" },
      { id: "t10", title: "Integração agendamento", assignee: "Diego Alves", priority: "high", status: "todo", dueDate: "2025-04-20", group: "Integrações" },
    ],
    deliverables: [
      { id: "d3", title: "Site institucional", type: "website", status: "in_progress", dueDate: "2025-05-01" },
    ],
  },
  {
    id: "3",
    name: "Agente de Voz IA",
    client: "FinanceiraXP",
    clientId: "c3",
    description: "Implementação de agente de voz para atendimento ao cliente",
    manager: "Ana Silva",
    team: ["Rafael Lima", "Mariana Duarte"],
    startDate: "2025-03-01",
    deadline: "2025-06-30",
    status: "planning",
    progress: 10,
    tasks: [
      { id: "t11", title: "Análise de requisitos", assignee: "Ana Silva", priority: "high", status: "in_progress", dueDate: "2025-03-15", group: "Planejamento" },
      { id: "t12", title: "Script de conversação", assignee: "Mariana Duarte", priority: "medium", status: "todo", dueDate: "2025-04-01", group: "Conteúdo" },
      { id: "t13", title: "Treinamento do modelo", assignee: "Rafael Lima", priority: "high", status: "todo", dueDate: "2025-05-01", group: "IA" },
    ],
    deliverables: [
      { id: "d4", title: "Agente de voz", type: "ai_agent", status: "pending", dueDate: "2025-06-15" },
    ],
  },
  {
    id: "4",
    name: "Campanha Q1 2025",
    client: "EduTech Academy",
    clientId: "c4",
    description: "Campanha completa de marketing digital para captação de alunos",
    manager: "Bruno Costa",
    team: ["Carlos Mendes", "Fernanda Rocha"],
    startDate: "2025-01-01",
    deadline: "2025-03-31",
    status: "completed",
    progress: 100,
    tasks: [
      { id: "t14", title: "Planejamento de mídia", assignee: "Carlos Mendes", priority: "high", status: "done", dueDate: "2025-01-15", group: "Planejamento" },
      { id: "t15", title: "Criação de conteúdo", assignee: "Fernanda Rocha", priority: "high", status: "done", dueDate: "2025-02-01", group: "Conteúdo" },
      { id: "t16", title: "Configurar ads", assignee: "Carlos Mendes", priority: "medium", status: "done", dueDate: "2025-02-15", group: "Ads" },
    ],
    deliverables: [
      { id: "d5", title: "Campanha Google Ads", type: "campaign", status: "approved", dueDate: "2025-02-01" },
      { id: "d6", title: "Automação de leads", type: "automation", status: "delivered", dueDate: "2025-02-15" },
    ],
  },
  {
    id: "5",
    name: "CRM Personalizado",
    client: "Logística Express",
    clientId: "c5",
    description: "Implementação de CRM personalizado com automações de follow-up",
    manager: "Ana Silva",
    team: ["Julia Santos", "Diego Alves"],
    startDate: "2025-02-15",
    deadline: "2025-05-30",
    status: "paused",
    progress: 30,
    tasks: [
      { id: "t17", title: "Levantamento de processos", assignee: "Julia Santos", priority: "high", status: "done", dueDate: "2025-03-01", group: "Planejamento" },
      { id: "t18", title: "Configuração do CRM", assignee: "Diego Alves", priority: "high", status: "in_progress", dueDate: "2025-03-20", group: "Implementação" },
    ],
    deliverables: [
      { id: "d7", title: "CRM configurado", type: "automation", status: "in_progress", dueDate: "2025-05-01" },
    ],
  },
];
