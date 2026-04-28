// ─── Unified Task Engine ───
// All items (projects, tasks, subtasks) share the same base structure.
// Differentiated by `task_type`.

export type TaskType = "project" | "task" | "subtask";

export type UnifiedStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "review"
  | "completed"
  | "blocked";

export type Priority = "low" | "medium" | "high" | "urgent";

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  mentions?: string[];
}

export interface TimeEntry {
  id: string;
  user: string;
  duration: number; // minutes
  date: string;
  description?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface AutomationTrigger {
  id: string;
  event: "created" | "status_changed" | "deadline_approaching" | "completed" | "assigned";
  action: string;
  enabled: boolean;
}

export interface TaskEngineItem {
  id: string;
  task_type: TaskType;
  title: string;
  description: string;

  // Hierarchy
  parentId: string | null; // null for projects
  projectId: string | null; // null for projects, self-ref for tasks

  // People
  owner: string;
  assignee: string;
  team: string[];

  // Client association
  clientId: string;
  clientName: string;

  // Dates
  startDate: string;
  dueDate: string;
  completedAt?: string;
  createdAt: string;

  // State
  status: UnifiedStatus;
  priority: Priority;
  progress: number; // 0-100, auto-calculated for projects/tasks from children

  // Metadata
  tags: string[];
  estimatedHours: number;

  // Collaboration
  comments: TaskComment[];
  timeEntries: TimeEntry[];
  attachments: Attachment[];

  // Automations
  automations: AutomationTrigger[];

  // Template
  template?: string;
}

// ─── Config maps ───

export const STATUS_CONFIG: Record<UnifiedStatus, { label: string; color: string; bg: string }> = {
  backlog: { label: "Backlog", color: "text-muted-foreground", bg: "bg-muted" },
  planned: { label: "Planejado", color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/.1)]" },
  in_progress: { label: "Em Progresso", color: "text-primary", bg: "bg-primary/10" },
  review: { label: "Revisão", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  completed: { label: "Concluído", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
  blocked: { label: "Bloqueado", color: "text-destructive", bg: "bg-destructive/10" },
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low: { label: "Baixa", color: "text-muted-foreground", bg: "bg-muted" },
  medium: { label: "Média", color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/.1)]" },
  high: { label: "Alta", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  urgent: { label: "Urgente", color: "text-destructive", bg: "bg-destructive/10" },
};

export const STATUSES: UnifiedStatus[] = ["backlog", "planned", "in_progress", "review", "completed", "blocked"];

export const TEAM_MEMBERS = [
  "Ana Silva", "Bruno Costa", "Carlos Mendes", "Diego Alves",
  "Fernanda Rocha", "Julia Santos", "Mariana Duarte", "Rafael Lima",
];

export const PROJECT_TEMPLATES = [
  { id: "crm", name: "Implementação CRM", icon: "Users" },
  { id: "automation", name: "Setup de Automação", icon: "Zap" },
  { id: "ai_agent", name: "Deploy de Agente IA", icon: "Bot" },
  { id: "website", name: "Desenvolvimento Web", icon: "Globe" },
  { id: "campaign", name: "Campanha de Marketing", icon: "Megaphone" },
  { id: "saas", name: "Desenvolvimento SaaS", icon: "Rocket" },
];

// ─── Helper functions ───

export function getChildren(items: TaskEngineItem[], parentId: string): TaskEngineItem[] {
  return items.filter((i) => i.parentId === parentId);
}

export function getProjects(items: TaskEngineItem[]): TaskEngineItem[] {
  return items.filter((i) => i.task_type === "project");
}

export function getProjectTasks(items: TaskEngineItem[], projectId: string): TaskEngineItem[] {
  return items.filter((i) => i.task_type === "task" && i.projectId === projectId);
}

export function getSubtasks(items: TaskEngineItem[], taskId: string): TaskEngineItem[] {
  return items.filter((i) => i.task_type === "subtask" && i.parentId === taskId);
}

export function calculateProgress(items: TaskEngineItem[], parentId: string): number {
  const children = getChildren(items, parentId);
  if (children.length === 0) return 0;
  const completed = children.filter((c) => c.status === "completed").length;
  return Math.round((completed / children.length) * 100);
}

export function getOverdueTasks(items: TaskEngineItem[]): TaskEngineItem[] {
  const now = new Date();
  return items.filter((i) => i.status !== "completed" && new Date(i.dueDate) < now);
}

// ─── Mock Data ───

export const mockTaskEngine: TaskEngineItem[] = [
  // PROJECT 1
  {
    id: "proj-1", task_type: "project", title: "Automação de Vendas", description: "Implementação completa de automação do funil de vendas com IA",
    parentId: null, projectId: null, owner: "Ana Silva", assignee: "Ana Silva", team: ["Carlos Mendes", "Julia Santos", "Rafael Lima"],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-01-15", dueDate: "2025-04-30", createdAt: "2025-01-10",
    status: "in_progress", priority: "high", progress: 50, tags: ["vendas", "automação", "ia"], estimatedHours: 120,
    comments: [], timeEntries: [], attachments: [], automations: [
      { id: "auto-1", event: "status_changed", action: "Notificar gerente", enabled: true },
      { id: "auto-2", event: "deadline_approaching", action: "Alerta 3 dias antes", enabled: true },
    ], template: "automation",
  },
  // Tasks for proj-1
  {
    id: "task-1", task_type: "task", title: "Mapear funil de vendas atual", description: "Documentar todos os estágios do funil de vendas.",
    parentId: "proj-1", projectId: "proj-1", owner: "Ana Silva", assignee: "Carlos Mendes", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-01-15", dueDate: "2025-02-01", completedAt: "2025-01-30", createdAt: "2025-01-15",
    status: "completed", priority: "high", progress: 100, tags: ["planejamento"], estimatedHours: 16,
    comments: [{ id: "cm-1", author: "Ana Silva", content: "Ótimo mapeamento! Podemos avançar.", createdAt: "2025-02-01T10:00:00" }],
    timeEntries: [{ id: "te-1", user: "Carlos Mendes", duration: 480, date: "2025-01-20", description: "Entrevistas" }],
    attachments: [], automations: [],
  },
  {
    id: "task-2", task_type: "task", title: "Configurar CRM", description: "Configurar CRM com pipelines e campos customizados.",
    parentId: "proj-1", projectId: "proj-1", owner: "Ana Silva", assignee: "Julia Santos", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-02-01", dueDate: "2025-02-15", completedAt: "2025-02-14", createdAt: "2025-02-01",
    status: "completed", priority: "high", progress: 100, tags: ["crm", "implementação"], estimatedHours: 24,
    comments: [], timeEntries: [{ id: "te-3", user: "Julia Santos", duration: 960, date: "2025-02-05" }],
    attachments: [], automations: [],
  },
  {
    id: "task-3", task_type: "task", title: "Integrar chatbot de IA", description: "Chatbot com IA para qualificação automática de leads.",
    parentId: "proj-1", projectId: "proj-1", owner: "Ana Silva", assignee: "Rafael Lima", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-02-20", dueDate: "2025-03-10", createdAt: "2025-02-20",
    status: "in_progress", priority: "urgent", progress: 50, tags: ["ia", "chatbot"], estimatedHours: 40,
    comments: [
      { id: "cm-2", author: "Rafael Lima", content: "Modelo treinado com 95% de acurácia.", createdAt: "2025-03-05T14:30:00" },
      { id: "cm-3", author: "Ana Silva", content: "@Rafael Lima excelente! Precisamos entregar até sexta.", createdAt: "2025-03-05T15:00:00", mentions: ["Rafael Lima"] },
    ],
    timeEntries: [{ id: "te-4", user: "Rafael Lima", duration: 1200, date: "2025-03-01" }],
    attachments: [], automations: [],
  },
  // Subtasks for task-3
  {
    id: "sub-1", task_type: "subtask", title: "Definir fluxo de conversação", description: "",
    parentId: "task-3", projectId: "proj-1", owner: "Rafael Lima", assignee: "Rafael Lima", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-02-20", dueDate: "2025-02-25", completedAt: "2025-02-24", createdAt: "2025-02-20",
    status: "completed", priority: "high", progress: 100, tags: [], estimatedHours: 8,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "sub-2", task_type: "subtask", title: "Treinar modelo de linguagem", description: "",
    parentId: "task-3", projectId: "proj-1", owner: "Rafael Lima", assignee: "Rafael Lima", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-02-25", dueDate: "2025-03-05", completedAt: "2025-03-04", createdAt: "2025-02-25",
    status: "completed", priority: "high", progress: 100, tags: [], estimatedHours: 16,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "sub-3", task_type: "subtask", title: "Integrar com CRM", description: "",
    parentId: "task-3", projectId: "proj-1", owner: "Rafael Lima", assignee: "Rafael Lima", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-03-05", dueDate: "2025-03-08", createdAt: "2025-03-05",
    status: "in_progress", priority: "high", progress: 0, tags: [], estimatedHours: 8,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "sub-4", task_type: "subtask", title: "Testes de qualidade", description: "",
    parentId: "task-3", projectId: "proj-1", owner: "Rafael Lima", assignee: "Rafael Lima", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-03-08", dueDate: "2025-03-10", createdAt: "2025-03-05",
    status: "backlog", priority: "medium", progress: 0, tags: [], estimatedHours: 8,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-4", task_type: "task", title: "Criar fluxos de email marketing", description: "Sequências automatizadas de email para nurturing.",
    parentId: "proj-1", projectId: "proj-1", owner: "Ana Silva", assignee: "Carlos Mendes", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-03-01", dueDate: "2025-03-20", createdAt: "2025-03-01",
    status: "in_progress", priority: "medium", progress: 33, tags: ["email", "marketing"], estimatedHours: 20,
    comments: [], timeEntries: [{ id: "te-6", user: "Carlos Mendes", duration: 360, date: "2025-03-03" }],
    attachments: [], automations: [],
  },
  {
    id: "task-5", task_type: "task", title: "Testes A/B", description: "Testes A/B nas landing pages.",
    parentId: "proj-1", projectId: "proj-1", owner: "Ana Silva", assignee: "Julia Santos", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-03-25", dueDate: "2025-04-01", createdAt: "2025-03-01",
    status: "planned", priority: "medium", progress: 0, tags: ["testes"], estimatedHours: 12,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-6", task_type: "task", title: "Deploy e monitoramento", description: "Deploy final e configurar monitoramento.",
    parentId: "proj-1", projectId: "proj-1", owner: "Ana Silva", assignee: "Ana Silva", team: [],
    clientId: "c1", clientName: "TechCorp Brasil", startDate: "2025-04-01", dueDate: "2025-04-15", createdAt: "2025-03-01",
    status: "backlog", priority: "high", progress: 0, tags: ["deploy"], estimatedHours: 16,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },

  // PROJECT 2
  {
    id: "proj-2", task_type: "project", title: "Website Institucional", description: "Redesign do site institucional com agendamento.",
    parentId: null, projectId: null, owner: "Bruno Costa", assignee: "Bruno Costa", team: ["Fernanda Rocha", "Diego Alves"],
    clientId: "c2", clientName: "Saúde Plus", startDate: "2025-02-01", dueDate: "2025-05-15", createdAt: "2025-01-25",
    status: "in_progress", priority: "high", progress: 25, tags: ["website", "saúde"], estimatedHours: 96,
    comments: [], timeEntries: [], attachments: [], automations: [], template: "website",
  },
  {
    id: "task-7", task_type: "task", title: "Wireframes", description: "Wireframes de todas as páginas.",
    parentId: "proj-2", projectId: "proj-2", owner: "Bruno Costa", assignee: "Fernanda Rocha", team: [],
    clientId: "c2", clientName: "Saúde Plus", startDate: "2025-02-01", dueDate: "2025-02-20", completedAt: "2025-02-18", createdAt: "2025-02-01",
    status: "completed", priority: "high", progress: 100, tags: ["design"], estimatedHours: 16,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-8", task_type: "task", title: "Design UI/UX", description: "Design completo do site.",
    parentId: "proj-2", projectId: "proj-2", owner: "Bruno Costa", assignee: "Fernanda Rocha", team: [],
    clientId: "c2", clientName: "Saúde Plus", startDate: "2025-02-20", dueDate: "2025-03-10", createdAt: "2025-02-20",
    status: "in_progress", priority: "high", progress: 50, tags: ["design", "ui/ux"], estimatedHours: 32,
    comments: [{ id: "cm-4", author: "Bruno Costa", content: "Homepage aprovada. Avance nas internas.", createdAt: "2025-03-04T11:00:00" }],
    timeEntries: [{ id: "te-7", user: "Fernanda Rocha", duration: 960, date: "2025-02-25" }],
    attachments: [], automations: [],
  },
  {
    id: "task-9", task_type: "task", title: "Desenvolvimento front-end", description: "Implementar site em React.",
    parentId: "proj-2", projectId: "proj-2", owner: "Bruno Costa", assignee: "Diego Alves", team: [],
    clientId: "c2", clientName: "Saúde Plus", startDate: "2025-03-15", dueDate: "2025-04-01", createdAt: "2025-03-01",
    status: "backlog", priority: "medium", progress: 0, tags: ["desenvolvimento", "react"], estimatedHours: 48,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-10", task_type: "task", title: "Integração agendamento", description: "Integrar sistema de agendamento online.",
    parentId: "proj-2", projectId: "proj-2", owner: "Bruno Costa", assignee: "Diego Alves", team: [],
    clientId: "c2", clientName: "Saúde Plus", startDate: "2025-04-01", dueDate: "2025-04-20", createdAt: "2025-03-01",
    status: "backlog", priority: "high", progress: 0, tags: ["integrações"], estimatedHours: 24,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },

  // PROJECT 3
  {
    id: "proj-3", task_type: "project", title: "Agente de Voz IA", description: "Agente de voz para atendimento ao cliente.",
    parentId: null, projectId: null, owner: "Ana Silva", assignee: "Ana Silva", team: ["Rafael Lima", "Mariana Duarte"],
    clientId: "c3", clientName: "FinanceiraXP", startDate: "2025-03-01", dueDate: "2025-06-30", createdAt: "2025-02-20",
    status: "planned", priority: "high", progress: 10, tags: ["ia", "voz"], estimatedHours: 160,
    comments: [], timeEntries: [], attachments: [], automations: [], template: "ai_agent",
  },
  {
    id: "task-11", task_type: "task", title: "Análise de requisitos", description: "Levantar requisitos do agente de voz.",
    parentId: "proj-3", projectId: "proj-3", owner: "Ana Silva", assignee: "Ana Silva", team: [],
    clientId: "c3", clientName: "FinanceiraXP", startDate: "2025-03-01", dueDate: "2025-03-15", createdAt: "2025-03-01",
    status: "in_progress", priority: "high", progress: 33, tags: ["planejamento"], estimatedHours: 12,
    comments: [{ id: "cm-5", author: "Ana Silva", content: "Cliente quer priorizar SAC.", createdAt: "2025-03-03T16:00:00" }],
    timeEntries: [{ id: "te-8", user: "Ana Silva", duration: 240, date: "2025-03-03" }],
    attachments: [], automations: [],
  },
  {
    id: "task-12", task_type: "task", title: "Script de conversação", description: "Scripts para cenários de atendimento.",
    parentId: "proj-3", projectId: "proj-3", owner: "Ana Silva", assignee: "Mariana Duarte", team: [],
    clientId: "c3", clientName: "FinanceiraXP", startDate: "2025-03-20", dueDate: "2025-04-01", createdAt: "2025-03-01",
    status: "backlog", priority: "medium", progress: 0, tags: ["conteúdo", "voz"], estimatedHours: 20,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-13", task_type: "task", title: "Treinamento do modelo", description: "Treinar modelo de IA para voz.",
    parentId: "proj-3", projectId: "proj-3", owner: "Ana Silva", assignee: "Rafael Lima", team: [],
    clientId: "c3", clientName: "FinanceiraXP", startDate: "2025-04-01", dueDate: "2025-05-01", createdAt: "2025-03-01",
    status: "backlog", priority: "high", progress: 0, tags: ["ia", "ml"], estimatedHours: 60,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },

  // PROJECT 4 - Completed
  {
    id: "proj-4", task_type: "project", title: "Campanha Q1 2025", description: "Campanha de marketing digital para captação de alunos.",
    parentId: null, projectId: null, owner: "Bruno Costa", assignee: "Bruno Costa", team: ["Carlos Mendes", "Fernanda Rocha"],
    clientId: "c4", clientName: "EduTech Academy", startDate: "2025-01-01", dueDate: "2025-03-31", completedAt: "2025-03-28", createdAt: "2024-12-20",
    status: "completed", priority: "medium", progress: 100, tags: ["marketing", "educação"], estimatedHours: 60,
    comments: [], timeEntries: [], attachments: [], automations: [], template: "campaign",
  },
  {
    id: "task-14", task_type: "task", title: "Planejamento de mídia", description: "Plano de mídia Q1.",
    parentId: "proj-4", projectId: "proj-4", owner: "Bruno Costa", assignee: "Carlos Mendes", team: [],
    clientId: "c4", clientName: "EduTech Academy", startDate: "2025-01-01", dueDate: "2025-01-15", completedAt: "2025-01-14", createdAt: "2025-01-01",
    status: "completed", priority: "high", progress: 100, tags: ["planejamento"], estimatedHours: 12,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-15", task_type: "task", title: "Criação de conteúdo", description: "Peças de conteúdo para campanha.",
    parentId: "proj-4", projectId: "proj-4", owner: "Bruno Costa", assignee: "Fernanda Rocha", team: [],
    clientId: "c4", clientName: "EduTech Academy", startDate: "2025-01-15", dueDate: "2025-02-01", completedAt: "2025-01-30", createdAt: "2025-01-15",
    status: "completed", priority: "high", progress: 100, tags: ["conteúdo"], estimatedHours: 24,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-16", task_type: "task", title: "Configurar ads", description: "Setup de campanhas Google e Meta Ads.",
    parentId: "proj-4", projectId: "proj-4", owner: "Bruno Costa", assignee: "Carlos Mendes", team: [],
    clientId: "c4", clientName: "EduTech Academy", startDate: "2025-02-01", dueDate: "2025-02-15", completedAt: "2025-02-13", createdAt: "2025-02-01",
    status: "completed", priority: "medium", progress: 100, tags: ["ads"], estimatedHours: 16,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },

  // PROJECT 5 - Blocked
  {
    id: "proj-5", task_type: "project", title: "CRM Personalizado", description: "CRM personalizado com automações de follow-up.",
    parentId: null, projectId: null, owner: "Ana Silva", assignee: "Ana Silva", team: ["Julia Santos", "Diego Alves"],
    clientId: "c5", clientName: "Logística Express", startDate: "2025-02-15", dueDate: "2025-05-30", createdAt: "2025-02-10",
    status: "blocked", priority: "medium", progress: 30, tags: ["crm", "logística"], estimatedHours: 80,
    comments: [{ id: "cm-7", author: "Ana Silva", content: "Cliente pediu pausa no projeto até abril.", createdAt: "2025-03-01T09:00:00" }],
    timeEntries: [], attachments: [], automations: [], template: "crm",
  },
  {
    id: "task-17", task_type: "task", title: "Levantamento de processos", description: "Mapear processos da logística.",
    parentId: "proj-5", projectId: "proj-5", owner: "Ana Silva", assignee: "Julia Santos", team: [],
    clientId: "c5", clientName: "Logística Express", startDate: "2025-02-15", dueDate: "2025-03-01", completedAt: "2025-02-28", createdAt: "2025-02-15",
    status: "completed", priority: "high", progress: 100, tags: ["planejamento"], estimatedHours: 16,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
  {
    id: "task-18", task_type: "task", title: "Configuração do CRM", description: "Setup do CRM com campos e pipelines.",
    parentId: "proj-5", projectId: "proj-5", owner: "Ana Silva", assignee: "Diego Alves", team: [],
    clientId: "c5", clientName: "Logística Express", startDate: "2025-03-01", dueDate: "2025-03-20", createdAt: "2025-03-01",
    status: "blocked", priority: "high", progress: 30, tags: ["crm"], estimatedHours: 32,
    comments: [], timeEntries: [], attachments: [], automations: [],
  },
];
