export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  avatar?: string;
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

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  estimatedEffort: number; // hours
  tags: string[];
  subtasks: Subtask[];
  comments: TaskComment[];
  timeEntries: TimeEntry[];
  recurring?: string; // "daily" | "weekly" | "monthly" | null
  createdAt: string;
}

export const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: "Baixa", color: "text-muted-foreground", bg: "bg-muted" },
  medium: { label: "Média", color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/.1)]" },
  high: { label: "Alta", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  urgent: { label: "Urgente", color: "text-destructive", bg: "bg-destructive/10" },
};

export const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo: { label: "A Fazer", color: "text-muted-foreground", bg: "bg-muted" },
  in_progress: { label: "Em Progresso", color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/.1)]" },
  review: { label: "Revisão", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/.1)]" },
  done: { label: "Concluída", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/.1)]" },
};

export const teamMembers = [
  "Ana Silva", "Bruno Costa", "Carlos Mendes", "Diego Alves",
  "Fernanda Rocha", "Julia Santos", "Mariana Duarte", "Rafael Lima",
];

export const mockTasks: Task[] = [
  {
    id: "task-1", title: "Mapear funil de vendas atual", description: "Documentar todos os estágios do funil de vendas e identificar pontos de melhoria para automação.",
    projectId: "1", projectName: "Automação de Vendas", clientId: "c1", clientName: "TechCorp Brasil",
    assignee: "Carlos Mendes", priority: "high", status: "done", startDate: "2025-01-15", dueDate: "2025-02-01",
    estimatedEffort: 16, tags: ["planejamento", "vendas"],
    subtasks: [
      { id: "st-1", title: "Entrevistar equipe de vendas", completed: true },
      { id: "st-2", title: "Mapear touchpoints do cliente", completed: true },
      { id: "st-3", title: "Criar diagrama do funil", completed: true },
    ],
    comments: [
      { id: "cm-1", author: "Ana Silva", content: "Ótimo mapeamento! Podemos avançar para a próxima fase.", createdAt: "2025-02-01T10:00:00" },
    ],
    timeEntries: [
      { id: "te-1", user: "Carlos Mendes", duration: 480, date: "2025-01-20", description: "Entrevistas e documentação" },
      { id: "te-2", user: "Carlos Mendes", duration: 360, date: "2025-01-25", description: "Diagrama do funil" },
    ],
    createdAt: "2025-01-15T09:00:00",
  },
  {
    id: "task-2", title: "Configurar CRM HubSpot", description: "Configurar CRM com pipelines, campos customizados e integrações necessárias.",
    projectId: "1", projectName: "Automação de Vendas", clientId: "c1", clientName: "TechCorp Brasil",
    assignee: "Julia Santos", priority: "high", status: "done", startDate: "2025-02-01", dueDate: "2025-02-15",
    estimatedEffort: 24, tags: ["crm", "implementação"],
    subtasks: [
      { id: "st-4", title: "Criar pipelines de vendas", completed: true },
      { id: "st-5", title: "Configurar campos customizados", completed: true },
      { id: "st-6", title: "Importar base de contatos", completed: true },
      { id: "st-7", title: "Testar automações básicas", completed: true },
    ],
    comments: [],
    timeEntries: [
      { id: "te-3", user: "Julia Santos", duration: 960, date: "2025-02-05" },
    ],
    createdAt: "2025-02-01T09:00:00",
  },
  {
    id: "task-3", title: "Integrar chatbot de IA", description: "Desenvolver e integrar chatbot com IA para qualificação automática de leads.",
    projectId: "1", projectName: "Automação de Vendas", clientId: "c1", clientName: "TechCorp Brasil",
    assignee: "Rafael Lima", priority: "urgent", status: "in_progress", startDate: "2025-02-20", dueDate: "2025-03-10",
    estimatedEffort: 40, tags: ["ia", "chatbot", "automação"],
    subtasks: [
      { id: "st-8", title: "Definir fluxo de conversação", completed: true },
      { id: "st-9", title: "Treinar modelo de linguagem", completed: true },
      { id: "st-10", title: "Integrar com CRM", completed: false },
      { id: "st-11", title: "Testes de qualidade", completed: false },
    ],
    comments: [
      { id: "cm-2", author: "Rafael Lima", content: "Modelo treinado com 95% de acurácia. Iniciando integração com CRM.", createdAt: "2025-03-05T14:30:00" },
      { id: "cm-3", author: "Ana Silva", content: "@Rafael Lima excelente! Precisamos entregar até sexta.", createdAt: "2025-03-05T15:00:00", mentions: ["Rafael Lima"] },
    ],
    timeEntries: [
      { id: "te-4", user: "Rafael Lima", duration: 1200, date: "2025-03-01" },
      { id: "te-5", user: "Rafael Lima", duration: 480, date: "2025-03-05" },
    ],
    createdAt: "2025-02-20T09:00:00",
  },
  {
    id: "task-4", title: "Criar fluxos de email marketing", description: "Configurar sequências automatizadas de email para nurturing de leads.",
    projectId: "1", projectName: "Automação de Vendas", clientId: "c1", clientName: "TechCorp Brasil",
    assignee: "Carlos Mendes", priority: "medium", status: "in_progress", startDate: "2025-03-01", dueDate: "2025-03-20",
    estimatedEffort: 20, tags: ["email", "automação", "marketing"],
    subtasks: [
      { id: "st-12", title: "Criar templates de email", completed: true },
      { id: "st-13", title: "Configurar triggers", completed: false },
      { id: "st-14", title: "Segmentar lista de contatos", completed: false },
    ],
    comments: [],
    timeEntries: [
      { id: "te-6", user: "Carlos Mendes", duration: 360, date: "2025-03-03" },
    ],
    createdAt: "2025-03-01T09:00:00",
  },
  {
    id: "task-5", title: "Design UI/UX do site", description: "Criar design completo do site institucional incluindo todas as páginas.",
    projectId: "2", projectName: "Website Institucional", clientId: "c2", clientName: "Saúde Plus",
    assignee: "Fernanda Rocha", priority: "high", status: "in_progress", startDate: "2025-02-20", dueDate: "2025-03-10",
    estimatedEffort: 32, tags: ["design", "ui/ux", "website"],
    subtasks: [
      { id: "st-15", title: "Moodboard e referências", completed: true },
      { id: "st-16", title: "Design da homepage", completed: true },
      { id: "st-17", title: "Design páginas internas", completed: false },
      { id: "st-18", title: "Design responsivo mobile", completed: false },
    ],
    comments: [
      { id: "cm-4", author: "Bruno Costa", content: "O cliente aprovou a homepage. Pode avançar nas internas.", createdAt: "2025-03-04T11:00:00" },
    ],
    timeEntries: [
      { id: "te-7", user: "Fernanda Rocha", duration: 960, date: "2025-02-25" },
    ],
    createdAt: "2025-02-20T09:00:00",
  },
  {
    id: "task-6", title: "Desenvolvimento front-end", description: "Implementar o site usando React com as páginas aprovadas no design.",
    projectId: "2", projectName: "Website Institucional", clientId: "c2", clientName: "Saúde Plus",
    assignee: "Diego Alves", priority: "medium", status: "todo", startDate: "2025-03-15", dueDate: "2025-04-01",
    estimatedEffort: 48, tags: ["desenvolvimento", "react", "frontend"],
    subtasks: [
      { id: "st-19", title: "Setup do projeto", completed: false },
      { id: "st-20", title: "Implementar homepage", completed: false },
      { id: "st-21", title: "Implementar páginas internas", completed: false },
      { id: "st-22", title: "Integrar sistema de agendamento", completed: false },
    ],
    comments: [],
    timeEntries: [],
    createdAt: "2025-03-01T09:00:00",
  },
  {
    id: "task-7", title: "Análise de requisitos - Agente de Voz", description: "Levantar todos os requisitos para o agente de voz IA do cliente.",
    projectId: "3", projectName: "Agente de Voz IA", clientId: "c3", clientName: "FinanceiraXP",
    assignee: "Ana Silva", priority: "high", status: "in_progress", startDate: "2025-03-01", dueDate: "2025-03-15",
    estimatedEffort: 12, tags: ["planejamento", "ia", "voz"],
    subtasks: [
      { id: "st-23", title: "Reunião com stakeholders", completed: true },
      { id: "st-24", title: "Documentar casos de uso", completed: false },
      { id: "st-25", title: "Definir métricas de sucesso", completed: false },
    ],
    comments: [
      { id: "cm-5", author: "Ana Silva", content: "Reunião com o cliente concluída. Eles querem priorizar atendimento SAC.", createdAt: "2025-03-03T16:00:00" },
    ],
    timeEntries: [
      { id: "te-8", user: "Ana Silva", duration: 240, date: "2025-03-03" },
    ],
    createdAt: "2025-03-01T09:00:00",
  },
  {
    id: "task-8", title: "Script de conversação do agente", description: "Criar scripts de conversação para diferentes cenários de atendimento.",
    projectId: "3", projectName: "Agente de Voz IA", clientId: "c3", clientName: "FinanceiraXP",
    assignee: "Mariana Duarte", priority: "medium", status: "todo", startDate: "2025-03-20", dueDate: "2025-04-01",
    estimatedEffort: 20, tags: ["conteúdo", "ia", "voz"],
    subtasks: [],
    comments: [],
    timeEntries: [],
    createdAt: "2025-03-01T09:00:00",
  },
  {
    id: "task-9", title: "Relatório mensal de performance", description: "Compilar dados e gerar relatório mensal para todos os clientes ativos.",
    projectId: "", projectName: "Interno", clientId: "", clientName: "Interno",
    assignee: "Bruno Costa", priority: "medium", status: "todo", startDate: "2025-03-25", dueDate: "2025-03-31",
    estimatedEffort: 8, tags: ["relatório", "mensal"],
    subtasks: [
      { id: "st-26", title: "Coletar métricas de cada projeto", completed: false },
      { id: "st-27", title: "Gerar gráficos e dashboards", completed: false },
      { id: "st-28", title: "Enviar para clientes", completed: false },
    ],
    comments: [],
    timeEntries: [],
    recurring: "monthly",
    createdAt: "2025-03-01T09:00:00",
  },
  {
    id: "task-10", title: "Otimização de campanha Google Ads", description: "Revisar e otimizar campanhas ativas do Google Ads para melhorar ROI.",
    projectId: "", projectName: "Interno", clientId: "c4", clientName: "EduTech Academy",
    assignee: "Carlos Mendes", priority: "high", status: "review", startDate: "2025-03-05", dueDate: "2025-03-12",
    estimatedEffort: 6, tags: ["ads", "otimização", "marketing"],
    subtasks: [
      { id: "st-29", title: "Analisar palavras-chave", completed: true },
      { id: "st-30", title: "Ajustar lances", completed: true },
      { id: "st-31", title: "Revisar copys dos anúncios", completed: true },
    ],
    comments: [
      { id: "cm-6", author: "Carlos Mendes", content: "CTR melhorou 23% com as novas copys. Aguardando review da @Ana Silva.", createdAt: "2025-03-10T09:00:00", mentions: ["Ana Silva"] },
    ],
    timeEntries: [
      { id: "te-9", user: "Carlos Mendes", duration: 180, date: "2025-03-08" },
    ],
    recurring: "weekly",
    createdAt: "2025-03-05T09:00:00",
  },
  {
    id: "task-11", title: "Testes A/B landing pages", description: "Configurar e executar testes A/B nas landing pages principais.",
    projectId: "1", projectName: "Automação de Vendas", clientId: "c1", clientName: "TechCorp Brasil",
    assignee: "Julia Santos", priority: "medium", status: "todo", startDate: "2025-03-25", dueDate: "2025-04-01",
    estimatedEffort: 12, tags: ["testes", "landing-page", "conversão"],
    subtasks: [],
    comments: [],
    timeEntries: [],
    createdAt: "2025-03-01T09:00:00",
  },
  {
    id: "task-12", title: "Deploy e monitoramento chatbot", description: "Realizar deploy final do chatbot e configurar monitoramento.",
    projectId: "1", projectName: "Automação de Vendas", clientId: "c1", clientName: "TechCorp Brasil",
    assignee: "Ana Silva", priority: "high", status: "todo", startDate: "2025-04-01", dueDate: "2025-04-15",
    estimatedEffort: 16, tags: ["deploy", "monitoramento", "chatbot"],
    subtasks: [],
    comments: [],
    timeEntries: [],
    createdAt: "2025-03-01T09:00:00",
  },
];
