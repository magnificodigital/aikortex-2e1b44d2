export type UserRole = "owner" | "admin" | "manager" | "member" | "client" | "partner";
export type UserStatus = "active" | "invited" | "suspended";
export type Department = "sales" | "operations" | "marketing" | "automation" | "development" | "design" | "support";

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: ModulePermissions;
  clients: ModulePermissions;
  projects: ModulePermissions;
  tasks: ModulePermissions;
  financials: ModulePermissions;
  contracts: ModulePermissions;
  integrations: ModulePermissions;
  partners: ModulePermissions;
  team: ModulePermissions;
}

export interface Skill {
  name: string;
  level: number; // 0-100
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  dueDate: string;
  status: "on_track" | "at_risk" | "completed" | "overdue";
}

export interface FeedbackEntry {
  id: string;
  fromUserId: string;
  fromName: string;
  type: "praise" | "suggestion" | "review";
  message: string;
  date: string;
  rating?: number; // 1-5
}

export interface PerformanceMetrics {
  score: number; // 0-100
  trend: "up" | "down" | "stable";
  punctuality: number; // 0-100
  quality: number; // 0-100
  collaboration: number; // 0-100
  initiative: number; // 0-100
  monthlyScores: { month: string; score: number }[];
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: Department;
  jobTitle: string;
  avatar?: string;
  status: UserStatus;
  phone?: string;
  joinedAt: string;
  lastActive: string;
  assignedTasks: number;
  activeProjects: number;
  overdueTasks: number;
  completedTasks: number;
  totalHoursLogged: number;
  skills: Skill[];
  goals: Goal[];
  feedback: FeedbackEntry[];
  performance: PerformanceMetrics;
  responsibilities: string[];
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  target: string;
  timestamp: string;
}

export const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  owner: { label: "Owner", color: "text-amber-600", bg: "bg-amber-500/10" },
  admin: { label: "Admin", color: "text-purple-600", bg: "bg-purple-500/10" },
  manager: { label: "Manager", color: "text-blue-600", bg: "bg-blue-500/10" },
  member: { label: "Membro", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  client: { label: "Cliente", color: "text-slate-600", bg: "bg-slate-500/10" },
  partner: { label: "Parceiro", color: "text-orange-600", bg: "bg-orange-500/10" },
};

export const statusConfig: Record<UserStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Ativo", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
  invited: { label: "Convidado", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  suspended: { label: "Suspenso", color: "text-destructive", bg: "bg-destructive/10" },
};

export const departmentConfig: Record<Department, { label: string; color: string; bg: string }> = {
  sales: { label: "Vendas", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  operations: { label: "Operações", color: "text-blue-600", bg: "bg-blue-500/10" },
  marketing: { label: "Marketing", color: "text-pink-600", bg: "bg-pink-500/10" },
  automation: { label: "Automação", color: "text-purple-600", bg: "bg-purple-500/10" },
  development: { label: "Desenvolvimento", color: "text-orange-600", bg: "bg-orange-500/10" },
  design: { label: "Design", color: "text-cyan-600", bg: "bg-cyan-500/10" },
  support: { label: "Suporte", color: "text-amber-600", bg: "bg-amber-500/10" },
};

const baseSkills: Record<string, Skill[]> = {
  "tm-1": [{ name: "Liderança", level: 95 }, { name: "Estratégia", level: 90 }, { name: "Negociação", level: 88 }],
  "tm-2": [{ name: "Gestão Operacional", level: 92 }, { name: "Análise de Dados", level: 85 }, { name: "Planejamento", level: 90 }],
  "tm-3": [{ name: "React/TypeScript", level: 95 }, { name: "Node.js", level: 88 }, { name: "Arquitetura", level: 82 }],
  "tm-4": [{ name: "SEO/SEM", level: 87 }, { name: "Analytics", level: 80 }, { name: "Copywriting", level: 78 }],
  "tm-5": [{ name: "n8n/Make", level: 92 }, { name: "APIs", level: 88 }, { name: "Python", level: 75 }],
  "tm-6": [{ name: "Figma", level: 95 }, { name: "UI Design", level: 90 }, { name: "Prototipagem", level: 85 }],
  "tm-7": [{ name: "Vendas B2B", level: 88 }, { name: "CRM", level: 82 }, { name: "Apresentações", level: 80 }],
  "tm-8": [{ name: "Atendimento", level: 70 }, { name: "Onboarding", level: 65 }],
  "tm-9": [{ name: "Full Stack", level: 80 }, { name: "DevOps", level: 72 }],
  "tm-10": [{ name: "Marketing Digital", level: 90 }, { name: "Branding", level: 85 }, { name: "Growth", level: 88 }],
};

const baseGoals: Record<string, Goal[]> = {
  "tm-1": [
    { id: "g1", title: "Fechar 5 novos contratos enterprise", description: "Expandir base de clientes enterprise", progress: 60, dueDate: "2025-06-30", status: "on_track" },
    { id: "g2", title: "Implementar OKRs trimestrais", description: "Sistema de metas para toda equipe", progress: 80, dueDate: "2025-04-15", status: "on_track" },
  ],
  "tm-2": [
    { id: "g3", title: "Reduzir tempo de entrega em 20%", description: "Otimizar processos operacionais", progress: 45, dueDate: "2025-05-30", status: "at_risk" },
  ],
  "tm-3": [
    { id: "g4", title: "Migrar para arquitetura de microsserviços", description: "Refatorar monolito", progress: 30, dueDate: "2025-08-30", status: "on_track" },
    { id: "g5", title: "Mentorar 2 devs juniores", description: "Programa de mentoria interna", progress: 100, dueDate: "2025-03-01", status: "completed" },
  ],
  "tm-4": [
    { id: "g6", title: "Aumentar tráfego orgânico em 40%", description: "Estratégia de conteúdo e SEO", progress: 72, dueDate: "2025-06-30", status: "on_track" },
  ],
  "tm-5": [
    { id: "g7", title: "Automatizar 15 processos", description: "Workflows de automação com IA", progress: 53, dueDate: "2025-07-30", status: "on_track" },
  ],
  "tm-6": [
    { id: "g8", title: "Criar Design System completo", description: "Componentes reutilizáveis", progress: 85, dueDate: "2025-04-30", status: "on_track" },
  ],
  "tm-7": [
    { id: "g9", title: "Atingir R$500k em vendas", description: "Meta de receita Q1-Q2", progress: 40, dueDate: "2025-06-30", status: "at_risk" },
  ],
  "tm-10": [
    { id: "g10", title: "Lançar 3 campanhas de performance", description: "Google Ads + Meta Ads", progress: 66, dueDate: "2025-05-15", status: "on_track" },
  ],
};

const baseFeedback: Record<string, FeedbackEntry[]> = {
  "tm-1": [
    { id: "f1", fromUserId: "tm-2", fromName: "Ana Oliveira", type: "praise", message: "Excelente liderança no projeto Alpha. Inspirou toda a equipe.", date: "2025-03-05", rating: 5 },
  ],
  "tm-2": [
    { id: "f2", fromUserId: "tm-1", fromName: "Rafael Costa", type: "review", message: "Ótima gestão operacional. Sugestão: delegar mais tarefas táticas.", date: "2025-03-01", rating: 4 },
  ],
  "tm-3": [
    { id: "f3", fromUserId: "tm-2", fromName: "Ana Oliveira", type: "praise", message: "Código impecável e mentoria excelente com os juniores.", date: "2025-02-28", rating: 5 },
    { id: "f4", fromUserId: "tm-1", fromName: "Rafael Costa", type: "suggestion", message: "Considere dedicar mais tempo à documentação técnica.", date: "2025-02-15" },
  ],
  "tm-4": [
    { id: "f5", fromUserId: "tm-10", fromName: "Fernanda Dias", type: "praise", message: "Resultados expressivos na campanha de conteúdo.", date: "2025-03-02", rating: 4 },
  ],
  "tm-5": [
    { id: "f6", fromUserId: "tm-3", fromName: "Lucas Mendes", type: "review", message: "Automações bem estruturadas. Melhorar tratamento de erros.", date: "2025-02-20", rating: 4 },
  ],
  "tm-6": [
    { id: "f7", fromUserId: "tm-4", fromName: "Mariana Santos", type: "praise", message: "Designs sempre surpreendem. Atenção incrível aos detalhes.", date: "2025-03-04", rating: 5 },
  ],
  "tm-7": [
    { id: "f8", fromUserId: "tm-1", fromName: "Rafael Costa", type: "suggestion", message: "Trabalhar na qualificação de leads para melhorar conversão.", date: "2025-02-25" },
  ],
  "tm-10": [
    { id: "f9", fromUserId: "tm-1", fromName: "Rafael Costa", type: "review", message: "Estratégia de marketing está alinhada com os objetivos. Continuar assim.", date: "2025-03-06", rating: 5 },
  ],
};

const basePerformance: Record<string, PerformanceMetrics> = {
  "tm-1": { score: 92, trend: "up", punctuality: 95, quality: 90, collaboration: 94, initiative: 96, monthlyScores: [{ month: "Out", score: 88 }, { month: "Nov", score: 90 }, { month: "Dez", score: 89 }, { month: "Jan", score: 91 }, { month: "Fev", score: 93 }, { month: "Mar", score: 92 }] },
  "tm-2": { score: 89, trend: "stable", punctuality: 92, quality: 88, collaboration: 90, initiative: 85, monthlyScores: [{ month: "Out", score: 87 }, { month: "Nov", score: 88 }, { month: "Dez", score: 90 }, { month: "Jan", score: 89 }, { month: "Fev", score: 88 }, { month: "Mar", score: 89 }] },
  "tm-3": { score: 94, trend: "up", punctuality: 88, quality: 98, collaboration: 92, initiative: 95, monthlyScores: [{ month: "Out", score: 90 }, { month: "Nov", score: 91 }, { month: "Dez", score: 93 }, { month: "Jan", score: 92 }, { month: "Fev", score: 95 }, { month: "Mar", score: 94 }] },
  "tm-4": { score: 82, trend: "up", punctuality: 85, quality: 80, collaboration: 82, initiative: 78, monthlyScores: [{ month: "Out", score: 75 }, { month: "Nov", score: 77 }, { month: "Dez", score: 79 }, { month: "Jan", score: 80 }, { month: "Fev", score: 81 }, { month: "Mar", score: 82 }] },
  "tm-5": { score: 87, trend: "stable", punctuality: 90, quality: 85, collaboration: 84, initiative: 90, monthlyScores: [{ month: "Out", score: 85 }, { month: "Nov", score: 86 }, { month: "Dez", score: 88 }, { month: "Jan", score: 87 }, { month: "Fev", score: 86 }, { month: "Mar", score: 87 }] },
  "tm-6": { score: 90, trend: "up", punctuality: 92, quality: 95, collaboration: 88, initiative: 82, monthlyScores: [{ month: "Out", score: 86 }, { month: "Nov", score: 87 }, { month: "Dez", score: 89 }, { month: "Jan", score: 90 }, { month: "Fev", score: 91 }, { month: "Mar", score: 90 }] },
  "tm-7": { score: 76, trend: "down", punctuality: 80, quality: 75, collaboration: 78, initiative: 70, monthlyScores: [{ month: "Out", score: 80 }, { month: "Nov", score: 79 }, { month: "Dez", score: 78 }, { month: "Jan", score: 77 }, { month: "Fev", score: 76 }, { month: "Mar", score: 76 }] },
  "tm-8": { score: 0, trend: "stable", punctuality: 0, quality: 0, collaboration: 0, initiative: 0, monthlyScores: [] },
  "tm-9": { score: 65, trend: "down", punctuality: 60, quality: 70, collaboration: 65, initiative: 55, monthlyScores: [{ month: "Out", score: 72 }, { month: "Nov", score: 70 }, { month: "Dez", score: 68 }, { month: "Jan", score: 66 }, { month: "Fev", score: 65 }] },
  "tm-10": { score: 88, trend: "up", punctuality: 90, quality: 87, collaboration: 92, initiative: 85, monthlyScores: [{ month: "Out", score: 84 }, { month: "Nov", score: 85 }, { month: "Dez", score: 86 }, { month: "Jan", score: 87 }, { month: "Fev", score: 88 }, { month: "Mar", score: 88 }] },
};

const baseResponsibilities: Record<string, string[]> = {
  "tm-1": ["Definir direção estratégica", "Aprovar orçamentos", "Relacionamento com parceiros-chave", "Gestão de C-level"],
  "tm-2": ["Coordenar operações diárias", "Monitorar KPIs", "Gestão de processos internos", "Relatórios executivos"],
  "tm-3": ["Definir arquitetura de sistemas", "Code review", "Mentoria técnica", "Planejamento de sprints"],
  "tm-4": ["Estratégia de conteúdo", "Gestão de redes sociais", "SEO/SEM", "Análise de métricas de growth"],
  "tm-5": ["Criar automações", "Integrar APIs", "Manutenção de workflows", "Testes de automação"],
  "tm-6": ["Design de interfaces", "Prototipagem", "Design system", "Testes de usabilidade"],
  "tm-7": ["Prospecção de clientes", "Gestão de pipeline", "Negociação de contratos", "Follow-up de leads"],
  "tm-8": ["Onboarding de clientes", "Suporte técnico", "Documentação de processos"],
  "tm-9": ["Desenvolvimento full stack", "Deploy e CI/CD", "Manutenção de sistemas"],
  "tm-10": ["Estratégia de marketing digital", "Gestão de campanhas", "Branding", "Análise de ROI"],
};

export const mockTeamMembers: TeamMember[] = [
  {
    id: "tm-1", fullName: "Rafael Costa", email: "rafael@agency.com", role: "owner",
    department: "operations", jobTitle: "CEO & Fundador", status: "active",
    phone: "+55 11 99999-0001", joinedAt: "2024-01-15", lastActive: "2025-03-09T10:30:00",
    assignedTasks: 8, activeProjects: 5, overdueTasks: 1, completedTasks: 142, totalHoursLogged: 1840,
    skills: baseSkills["tm-1"], goals: baseGoals["tm-1"] || [], feedback: baseFeedback["tm-1"] || [],
    performance: basePerformance["tm-1"], responsibilities: baseResponsibilities["tm-1"],
  },
  {
    id: "tm-2", fullName: "Ana Oliveira", email: "ana@agency.com", role: "admin",
    department: "operations", jobTitle: "COO", status: "active",
    phone: "+55 11 99999-0002", joinedAt: "2024-02-01", lastActive: "2025-03-09T09:15:00",
    assignedTasks: 12, activeProjects: 7, overdueTasks: 2, completedTasks: 198, totalHoursLogged: 2100,
    skills: baseSkills["tm-2"], goals: baseGoals["tm-2"] || [], feedback: baseFeedback["tm-2"] || [],
    performance: basePerformance["tm-2"], responsibilities: baseResponsibilities["tm-2"],
  },
  {
    id: "tm-3", fullName: "Lucas Mendes", email: "lucas@agency.com", role: "manager",
    department: "development", jobTitle: "Tech Lead", status: "active",
    joinedAt: "2024-03-10", lastActive: "2025-03-09T08:45:00",
    assignedTasks: 15, activeProjects: 4, overdueTasks: 3, completedTasks: 167, totalHoursLogged: 1920,
    skills: baseSkills["tm-3"], goals: baseGoals["tm-3"] || [], feedback: baseFeedback["tm-3"] || [],
    performance: basePerformance["tm-3"], responsibilities: baseResponsibilities["tm-3"],
  },
  {
    id: "tm-4", fullName: "Mariana Santos", email: "mariana@agency.com", role: "member",
    department: "marketing", jobTitle: "Growth Specialist", status: "active",
    joinedAt: "2024-04-20", lastActive: "2025-03-08T17:30:00",
    assignedTasks: 9, activeProjects: 3, overdueTasks: 0, completedTasks: 89, totalHoursLogged: 960,
    skills: baseSkills["tm-4"], goals: baseGoals["tm-4"] || [], feedback: baseFeedback["tm-4"] || [],
    performance: basePerformance["tm-4"], responsibilities: baseResponsibilities["tm-4"],
  },
  {
    id: "tm-5", fullName: "Pedro Almeida", email: "pedro@agency.com", role: "member",
    department: "automation", jobTitle: "Automation Engineer", status: "active",
    joinedAt: "2024-05-15", lastActive: "2025-03-09T11:00:00",
    assignedTasks: 11, activeProjects: 4, overdueTasks: 1, completedTasks: 134, totalHoursLogged: 1450,
    skills: baseSkills["tm-5"], goals: baseGoals["tm-5"] || [], feedback: baseFeedback["tm-5"] || [],
    performance: basePerformance["tm-5"], responsibilities: baseResponsibilities["tm-5"],
  },
  {
    id: "tm-6", fullName: "Juliana Lima", email: "juliana@agency.com", role: "member",
    department: "design", jobTitle: "UI/UX Designer", status: "active",
    joinedAt: "2024-06-01", lastActive: "2025-03-09T10:00:00",
    assignedTasks: 7, activeProjects: 3, overdueTasks: 0, completedTasks: 76, totalHoursLogged: 820,
    skills: baseSkills["tm-6"], goals: baseGoals["tm-6"] || [], feedback: baseFeedback["tm-6"] || [],
    performance: basePerformance["tm-6"], responsibilities: baseResponsibilities["tm-6"],
  },
  {
    id: "tm-7", fullName: "Carlos Ferreira", email: "carlos@agency.com", role: "member",
    department: "sales", jobTitle: "Account Executive", status: "active",
    joinedAt: "2024-07-10", lastActive: "2025-03-08T16:00:00",
    assignedTasks: 6, activeProjects: 2, overdueTasks: 0, completedTasks: 54, totalHoursLogged: 580,
    skills: baseSkills["tm-7"], goals: baseGoals["tm-7"] || [], feedback: baseFeedback["tm-7"] || [],
    performance: basePerformance["tm-7"], responsibilities: baseResponsibilities["tm-7"],
  },
  {
    id: "tm-8", fullName: "Beatriz Rocha", email: "beatriz@agency.com", role: "member",
    department: "support", jobTitle: "Customer Success", status: "invited",
    joinedAt: "2025-03-01", lastActive: "",
    assignedTasks: 0, activeProjects: 0, overdueTasks: 0, completedTasks: 0, totalHoursLogged: 0,
    skills: baseSkills["tm-8"], goals: [], feedback: [], performance: basePerformance["tm-8"], responsibilities: baseResponsibilities["tm-8"],
  },
  {
    id: "tm-9", fullName: "Diego Nascimento", email: "diego@agency.com", role: "member",
    department: "development", jobTitle: "Full Stack Developer", status: "suspended",
    joinedAt: "2024-04-01", lastActive: "2025-02-15T14:00:00",
    assignedTasks: 0, activeProjects: 0, overdueTasks: 0, completedTasks: 45, totalHoursLogged: 520,
    skills: baseSkills["tm-9"], goals: [], feedback: [], performance: basePerformance["tm-9"], responsibilities: baseResponsibilities["tm-9"],
  },
  {
    id: "tm-10", fullName: "Fernanda Dias", email: "fernanda@agency.com", role: "manager",
    department: "marketing", jobTitle: "Marketing Director", status: "active",
    joinedAt: "2024-03-20", lastActive: "2025-03-09T09:30:00",
    assignedTasks: 10, activeProjects: 5, overdueTasks: 1, completedTasks: 112, totalHoursLogged: 1280,
    skills: baseSkills["tm-10"], goals: baseGoals["tm-10"] || [], feedback: baseFeedback["tm-10"] || [],
    performance: basePerformance["tm-10"], responsibilities: baseResponsibilities["tm-10"],
  },
];

export const mockActivityLog: ActivityLogEntry[] = [
  { id: "al-1", userId: "tm-1", action: "Login", target: "Sistema", timestamp: "2025-03-09T10:30:00" },
  { id: "al-2", userId: "tm-2", action: "Editou projeto", target: "Projeto Alpha", timestamp: "2025-03-09T09:15:00" },
  { id: "al-3", userId: "tm-3", action: "Completou tarefa", target: "Setup API Gateway", timestamp: "2025-03-09T08:45:00" },
  { id: "al-4", userId: "tm-5", action: "Criou automação", target: "Lead Scoring Flow", timestamp: "2025-03-09T11:00:00" },
  { id: "al-5", userId: "tm-4", action: "Adicionou cliente", target: "TechVentures Inc", timestamp: "2025-03-08T17:30:00" },
  { id: "al-6", userId: "tm-6", action: "Enviou design", target: "Landing Page v3", timestamp: "2025-03-09T10:00:00" },
  { id: "al-7", userId: "tm-10", action: "Criou campanha", target: "Q1 Email Campaign", timestamp: "2025-03-09T09:30:00" },
  { id: "al-8", userId: "tm-7", action: "Fechou deal", target: "Contract #2847", timestamp: "2025-03-08T16:00:00" },
];
