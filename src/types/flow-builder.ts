// ── Flow Builder Types – Full 10-Category Block System ──

export type FlowNodeCategory =
  | "trigger"
  | "processing"
  | "logic"
  | "control"
  | "output"
  | "integration"
  | "data_capture"
  | "crm_actions"
  | "knowledge"
  | "database"
  | "dev_advanced";

export interface FlowNodeData {
  label: string;
  category: FlowNodeCategory;
  icon: string;
  description: string;
  config: Record<string, unknown>;
  color: string;
  nodeType: string;
}

export interface NodeTemplate {
  type: string;
  label: string;
  category: FlowNodeCategory;
  icon: string;
  description: string;
  color: string;
  defaultConfig: Record<string, unknown>;
}

export const NODE_CATEGORIES: { key: FlowNodeCategory; label: string; color: string }[] = [
  { key: "trigger", label: "Gatilhos", color: "#22c55e" },
  { key: "processing", label: "Processamento", color: "#6366f1" },
  { key: "logic", label: "Lógica", color: "#f59e0b" },
  { key: "control", label: "Controle", color: "#ec4899" },
  { key: "output", label: "Saída", color: "#06b6d4" },
  { key: "data_capture", label: "Captura de Dados", color: "#10b981" },
  { key: "crm_actions", label: "CRM", color: "#f97316" },
  { key: "knowledge", label: "Conhecimento / IA", color: "#a855f7" },
  { key: "integration", label: "Integração", color: "#8b5cf6" },
  { key: "database", label: "Banco de Dados", color: "#3b82f6" },
  { key: "dev_advanced", label: "Avançado", color: "#64748b" },
];

export const NODE_TEMPLATES: NodeTemplate[] = [
  // ── Gatilhos ──
  { type: "trigger_chat", label: "Mensagem Recebida", category: "trigger", icon: "💬", description: "Inicia ao receber uma mensagem de chat", color: "#22c55e", defaultConfig: { channel: "any" } },
  { type: "trigger_webhook", label: "Webhook", category: "trigger", icon: "🔗", description: "Inicia via chamada externa de API", color: "#22c55e", defaultConfig: { method: "POST" } },
  { type: "trigger_schedule", label: "Agendamento", category: "trigger", icon: "📅", description: "Inicia em horários programados", color: "#22c55e", defaultConfig: { frequency: "daily", time: "09:00" } },
  { type: "trigger_new_lead", label: "Novo Lead", category: "trigger", icon: "🎯", description: "Disparado quando um novo lead é criado", color: "#22c55e", defaultConfig: { source: "any" } },
  { type: "trigger_manual", label: "Manual", category: "trigger", icon: "🖱️", description: "Disparado manualmente pelo usuário", color: "#22c55e", defaultConfig: {} },

  // ── Processamento ──
  { type: "agent_ai", label: "Agente IA", category: "processing", icon: "🧠", description: "Processa a mensagem com um agente IA", color: "#6366f1", defaultConfig: { agentId: "", model: "gemini-2.5-flash", temperature: 0.7, systemPrompt: "" } },
  { type: "api", label: "Requisição HTTP", category: "processing", icon: "🌐", description: "Chama uma API externa via HTTP", color: "#6366f1", defaultConfig: { url: "", method: "GET", headers: {}, body: "" } },
  { type: "intent_classifier", label: "Classificar Intenção", category: "processing", icon: "🏷️", description: "Identifica a intenção do usuário com IA", color: "#6366f1", defaultConfig: { model: "gemini-2.5-flash", intents: "" } },
  { type: "summarizer", label: "Resumir Texto", category: "processing", icon: "📄", description: "Gera um resumo de um texto longo", color: "#6366f1", defaultConfig: { model: "gemini-2.5-flash", maxLength: 200 } },

  // ── Lógica ──
  { type: "condition", label: "Se / Então", category: "logic", icon: "🔀", description: "Ramifica o fluxo com base em uma condição", color: "#f59e0b", defaultConfig: { expression: "" } },
  { type: "router", label: "Roteador IA", category: "logic", icon: "🧭", description: "Roteia o fluxo de forma inteligente com IA", color: "#f59e0b", defaultConfig: { model: "gemini-2.5-flash", routes: [] } },
  { type: "filter", label: "Filtro", category: "logic", icon: "🔽", description: "Filtra itens com base em condições", color: "#f59e0b", defaultConfig: { condition: "" } },

  // ── Controle ──
  { type: "wait", label: "Aguardar", category: "control", icon: "⏳", description: "Pausa a execução por um tempo definido", color: "#ec4899", defaultConfig: { duration: 5, unit: "seconds" } },
  { type: "loop", label: "Repetir", category: "control", icon: "🔄", description: "Itera sobre uma lista de itens", color: "#ec4899", defaultConfig: { iterableVariable: "", maxIterations: 100 } },
  { type: "human_in_loop", label: "Aprovação Humana", category: "control", icon: "👤", description: "Pausa para aprovação humana", color: "#ec4899", defaultConfig: { approvalMessage: "Aprovar para continuar?" } },
  { type: "stop", label: "Encerrar", category: "control", icon: "🛑", description: "Encerra a execução do fluxo", color: "#ec4899", defaultConfig: { reason: "" } },

  // ── Saída ──
  { type: "send_message", label: "Enviar Mensagem", category: "output", icon: "💬", description: "Envia uma mensagem de resposta ao usuário", color: "#06b6d4", defaultConfig: { message: "{{agent_response}}" } },
  { type: "send_email", label: "Enviar E-mail", category: "output", icon: "📧", description: "Envia um e-mail", color: "#06b6d4", defaultConfig: { to: "", subject: "", body: "" } },
  { type: "send_whatsapp", label: "Enviar WhatsApp", category: "output", icon: "📱", description: "Envia uma mensagem via WhatsApp", color: "#06b6d4", defaultConfig: { phone: "", template: "" } },
  { type: "create_notification", label: "Notificar", category: "output", icon: "🔔", description: "Cria uma notificação interna", color: "#06b6d4", defaultConfig: { title: "", message: "" } },

  // ── Captura de Dados ──
  { type: "capture_name", label: "Capturar Nome", category: "data_capture", icon: "👤", description: "Pergunta e captura o nome do usuário", color: "#10b981", defaultConfig: { prompt: "Qual é o seu nome?", variable: "name", required: true } },
  { type: "capture_email", label: "Capturar E-mail", category: "data_capture", icon: "📧", description: "Pergunta e captura o e-mail com validação", color: "#10b981", defaultConfig: { prompt: "Qual é o seu e-mail?", variable: "email", required: true } },
  { type: "capture_phone", label: "Capturar Telefone", category: "data_capture", icon: "📞", description: "Pergunta e captura o telefone", color: "#10b981", defaultConfig: { prompt: "Qual é o seu telefone?", variable: "phone", required: true } },
  { type: "capture_company", label: "Capturar Empresa", category: "data_capture", icon: "🏢", description: "Pergunta e captura o nome da empresa", color: "#10b981", defaultConfig: { prompt: "Qual é a sua empresa?", variable: "company", required: false } },
  { type: "capture_need", label: "Capturar Necessidade", category: "data_capture", icon: "❓", description: "Captura a principal necessidade do usuário", color: "#10b981", defaultConfig: { prompt: "Qual sua principal necessidade?", variable: "need", required: true } },

  // ── CRM ──
  { type: "crm_create_lead", label: "Criar Lead", category: "crm_actions", icon: "➕", description: "Cria um novo lead no CRM", color: "#f97316", defaultConfig: { provider: "internal", name: "{{name}}", email: "{{email}}", phone: "{{phone}}" } },
  { type: "crm_update_lead", label: "Atualizar Lead", category: "crm_actions", icon: "✏️", description: "Atualiza um lead existente", color: "#f97316", defaultConfig: { leadId: "", fields: "" } },
  { type: "crm_move_stage", label: "Mover Etapa", category: "crm_actions", icon: "➡️", description: "Move o lead para outra etapa", color: "#f97316", defaultConfig: { dealId: "", targetStage: "" } },
  { type: "crm_create_task", label: "Criar Tarefa", category: "crm_actions", icon: "📝", description: "Cria uma tarefa de follow-up", color: "#f97316", defaultConfig: { title: "", assignee: "", dueDate: "" } },
  { type: "crm_create_followup", label: "Agendar Follow-up", category: "crm_actions", icon: "🔔", description: "Agenda um follow-up automático", color: "#f97316", defaultConfig: { type: "whatsapp", delay: "24h", message: "" } },
  { type: "crm_add_tag", label: "Adicionar Tag", category: "crm_actions", icon: "🏷️", description: "Adiciona uma tag ao lead", color: "#f97316", defaultConfig: { tag: "" } },

  // ── Conhecimento / IA ──
  { type: "knowledge_search", label: "Consultar Base", category: "knowledge", icon: "📚", description: "Busca na base de conhecimento", color: "#a855f7", defaultConfig: { query: "", maxResults: 5 } },
  { type: "memory_lookup", label: "Memória do Agente", category: "knowledge", icon: "🧠", description: "Recupera memórias salvas do agente", color: "#a855f7", defaultConfig: { lookbackMessages: 10 } },
  { type: "rag_search", label: "Busca RAG", category: "knowledge", icon: "🔎", description: "Busca aumentada por IA em uma coleção", color: "#a855f7", defaultConfig: { query: "", collection: "", topK: 5 } },

  // ── Integração ──
  { type: "integration_whatsapp", label: "WhatsApp", category: "integration", icon: "📱", description: "Envia mensagem via WhatsApp Business", color: "#8b5cf6", defaultConfig: { template: "", phone: "" } },
  { type: "integration_email", label: "E-mail", category: "integration", icon: "📧", description: "Envia e-mails", color: "#8b5cf6", defaultConfig: { to: "", subject: "", body: "" } },
  { type: "integration_calendar", label: "Calendário", category: "integration", icon: "📅", description: "Cria eventos no Google Calendar", color: "#8b5cf6", defaultConfig: { provider: "google_calendar", action: "create_event" } },
  { type: "integration_sheets", label: "Google Sheets", category: "integration", icon: "📊", description: "Lê e escreve em planilhas", color: "#8b5cf6", defaultConfig: { spreadsheetId: "", range: "" } },

  // ── Banco de Dados ──
  { type: "db_create_record", label: "Criar Registro", category: "database", icon: "➕", description: "Cria um novo registro no banco", color: "#3b82f6", defaultConfig: { table: "", data: "" } },
  { type: "db_find_record", label: "Buscar Registro", category: "database", icon: "🔍", description: "Busca registros em uma tabela", color: "#3b82f6", defaultConfig: { table: "", filter: "" } },
  { type: "db_update_record", label: "Atualizar Registro", category: "database", icon: "✏️", description: "Atualiza um registro existente", color: "#3b82f6", defaultConfig: { table: "", recordId: "", data: "" } },

  // ── Avançado ──
  { type: "function", label: "Código Customizado", category: "dev_advanced", icon: "⚡", description: "Executa código JavaScript customizado", color: "#64748b", defaultConfig: { code: "", language: "javascript" } },
  { type: "webhook_response", label: "Resposta Webhook", category: "dev_advanced", icon: "↩️", description: "Retorna resposta a um webhook", color: "#64748b", defaultConfig: { statusCode: 200, body: "" } },
];

// ── Execution Types ──

export type FlowExecutionNodeType =
  | 'trigger.chat'
  | 'trigger.webhook'
  | 'trigger.schedule'
  | 'agent.message'
  | 'agent.extract'
  | 'agent.decide'
  | 'flow.condition'
  | 'flow.delay'
  | 'flow.split'
  | 'action.send_message'
  | 'action.update_crm'
  | 'action.webhook'
  | 'action.notify'
  | 'end.success'
  | 'end.failure';

export interface FlowNodeConfig {
  agent_id?: string;
  prompt_template?: string;
  output_variable?: string;
  extract_schema?: object;
  condition_variable?: string;
  condition_operator?: 'equals' | 'contains' | 'greater_than' | 'is_empty';
  condition_value?: string;
  delay_minutes?: number;
  channel?: string;
  message_template?: string;
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST';
  webhook_body?: string;
}

export interface FlowExecution {
  id: string;
  flow_id: string;
  flow_name: string | null;
  status: 'running' | 'completed' | 'failed' | 'paused';
  trigger_type: string;
  context: Record<string, unknown>;
  current_node_id: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface FlowNodeLog {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  node_label: string | null;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  agent_session_id: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

// ── Saved Flow ──

export interface SavedFlow {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused";
  folderId: string | null;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowFolder {
  id: string;
  name: string;
  createdAt: string;
}

// ── Flow Templates ──

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  nodes: unknown[];
  edges: unknown[];
}

const pos = (x: number, y: number) => ({ x, y });

const nd = (id: string, label: string, category: FlowNodeCategory, icon: string, desc: string, color: string, cfg: Record<string, unknown>, p: { x: number; y: number }, nodeType: string) => ({
  id,
  type: "flowNode",
  position: p,
  data: { label, category, icon, description: desc, config: cfg, color, nodeType } as FlowNodeData,
});

const ed = (src: string, tgt: string, srcHandle?: string) => ({
  id: `e-${src}-${tgt}`,
  source: src,
  target: tgt,
  sourceHandle: srcHandle,
  animated: true,
  style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
});

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "tpl-lead-qualification",
    name: "Qualificação de Leads",
    description: "Qualifica leads automaticamente via chat, capturando dados e enviando para o CRM.",
    category: "Vendas",
    icon: "🎯",
    tags: ["lead", "vendas", "crm"],
    nodes: [
      nd("s1", "Chat", "trigger", "💬", "Nova mensagem recebida", "#22c55e", { channel: "whatsapp" }, pos(50, 200), "trigger_chat"),
      nd("s2", "Agente IA", "processing", "🧠", "Qualifica o lead", "#6366f1", { agentType: "sdr", model: "gemini-2.5-flash", temperature: 0.7 }, pos(350, 200), "agent_ai"),
      nd("s3", "Condition", "logic", "🔀", "Lead qualificado?", "#f59e0b", { expression: '{{score}} >= 7' }, pos(650, 200), "condition"),
      nd("s4", "CRM", "integration", "💼", "Salva no CRM", "#8b5cf6", { provider: "hubspot", action: "create_lead" }, pos(950, 100), "integration_crm"),
      nd("s5", "Response", "output", "📤", "Envia resposta", "#06b6d4", { format: "text", template: "Lead qualificado!" }, pos(950, 300), "response"),
    ],
    edges: [
      ed("s1", "s2"), ed("s2", "s3"),
      ed("s3", "s4", "yes"), ed("s3", "s5", "no"),
    ],
  },
  {
    id: "tpl-customer-support",
    name: "Atendimento ao Cliente",
    description: "Fluxo de atendimento com IA que resolve dúvidas ou transfere para humano.",
    category: "Suporte",
    icon: "🛟",
    tags: ["sac", "suporte", "atendimento"],
    nodes: [
      nd("c1", "Chat", "trigger", "💬", "Nova mensagem", "#22c55e", { channel: "any" }, pos(50, 200), "trigger_chat"),
      nd("c2", "Agente IA", "processing", "🧠", "Analisa e responde", "#6366f1", { agentType: "sac", model: "gemini-2.5-flash", systemPrompt: "Você é um assistente de suporte." }, pos(350, 200), "agent_ai"),
      nd("c3", "Evaluator", "logic", "📊", "Avalia qualidade", "#f59e0b", { criteria: "resolved" }, pos(650, 200), "evaluator"),
      nd("c4", "Response", "output", "📤", "Resposta final", "#06b6d4", { format: "text" }, pos(950, 100), "response"),
      nd("c5", "Human in the Loop", "control", "👤", "Escalar para humano", "#ec4899", { approvalMessage: "Caso não resolvido" }, pos(950, 300), "human_in_loop"),
    ],
    edges: [
      ed("c1", "c2"), ed("c2", "c3"),
      ed("c3", "c4", "yes"), ed("c3", "c5", "no"),
    ],
  },
  {
    id: "tpl-data-pipeline",
    name: "Pipeline de Dados",
    description: "Coleta dados via API, processa com código customizado e salva em planilha.",
    category: "Automação",
    icon: "🔄",
    tags: ["api", "dados", "automação"],
    nodes: [
      nd("d1", "Schedule", "trigger", "📅", "Executa diariamente", "#22c55e", { frequency: "daily", time: "08:00" }, pos(50, 200), "trigger_schedule"),
      nd("d2", "API", "processing", "🌐", "Busca dados externos", "#6366f1", { url: "https://api.example.com/data", method: "GET" }, pos(350, 200), "api"),
      nd("d3", "Function", "processing", "⚡", "Transforma dados", "#6366f1", { code: "return data.map(item => ({ ...item, processed: true }))" }, pos(650, 200), "function"),
      nd("d4", "Google Sheets", "integration", "📊", "Salva na planilha", "#8b5cf6", { spreadsheetId: "", range: "A1" }, pos(950, 200), "integration_sheets"),
    ],
    edges: [
      ed("d1", "d2"), ed("d2", "d3"), ed("d3", "d4"),
    ],
  },
  {
    id: "tpl-appointment",
    name: "Agendamento de Reunião",
    description: "Automatiza agendamento de reuniões com validação de horários.",
    category: "Produtividade",
    icon: "📅",
    tags: ["agendamento", "reunião", "calendário"],
    nodes: [
      nd("m1", "Chat", "trigger", "💬", "Pedido de reunião", "#22c55e", { channel: "any" }, pos(50, 200), "trigger_chat"),
      nd("m2", "Agente IA", "processing", "🧠", "Identifica necessidade", "#6366f1", { agentType: "", model: "gemini-2.5-flash", temperature: 0.5 }, pos(350, 200), "agent_ai"),
      nd("m3", "Calendar", "integration", "📅", "Agenda no calendário", "#8b5cf6", { provider: "google_calendar", action: "create_event" }, pos(650, 200), "integration_calendar"),
      nd("m4", "Response", "output", "📤", "Confirma agendamento", "#06b6d4", { format: "text", template: "Reunião agendada ✅" }, pos(950, 200), "response"),
    ],
    edges: [
      ed("m1", "m2"), ed("m2", "m3"), ed("m3", "m4"),
    ],
  },
  {
    id: "tpl-sdr-inbound",
    name: "SDR Inbound",
    description: "Agente SDR que qualifica leads inbound automaticamente.",
    category: "Vendas",
    icon: "📞",
    tags: ["sdr", "inbound", "vendas"],
    nodes: [
      nd("si1", "Novo Lead", "trigger", "🎯", "Lead inbound recebido", "#22c55e", { source: "form" }, pos(50, 200), "trigger_new_lead"),
      nd("si2", "Capturar Nome", "data_capture", "👤", "Captura nome do lead", "#10b981", { prompt: "Qual o seu nome?", variable: "name" }, pos(350, 200), "capture_name"),
      nd("si3", "Capturar E-mail", "data_capture", "📧", "Captura e-mail", "#10b981", { prompt: "Qual seu e-mail?", variable: "email" }, pos(650, 200), "capture_email"),
      nd("si4", "Agente IA", "processing", "🧠", "SDR qualifica", "#6366f1", { agentType: "sdr", model: "gemini-2.5-flash" }, pos(950, 200), "agent_ai"),
      nd("si5", "Criar Lead", "crm_actions", "➕", "Cria lead no CRM", "#f97316", { provider: "internal" }, pos(1250, 200), "crm_create_lead"),
    ],
    edges: [ed("si1", "si2"), ed("si2", "si3"), ed("si3", "si4"), ed("si4", "si5")],
  },
  {
    id: "tpl-followup",
    name: "Follow-up Comercial",
    description: "Envia follow-ups automáticos para leads que não responderam.",
    category: "Vendas",
    icon: "🔔",
    tags: ["followup", "vendas", "reengajamento"],
    nodes: [
      nd("f1", "Schedule", "trigger", "📅", "Check diário", "#22c55e", { frequency: "daily", time: "10:00" }, pos(50, 200), "trigger_schedule"),
      nd("f2", "Find Record", "database", "🔍", "Busca leads sem resposta", "#3b82f6", { table: "leads", filter: "last_response > 48h" }, pos(350, 200), "db_find_record"),
      nd("f3", "Loop", "control", "🔄", "Para cada lead", "#ec4899", { iterableVariable: "leads" }, pos(650, 200), "loop"),
      nd("f4", "Send Email", "output", "📧", "Envia follow-up", "#06b6d4", { subject: "Ainda posso ajudar?" }, pos(950, 200), "send_email"),
    ],
    edges: [ed("f1", "f2"), ed("f2", "f3"), ed("f3", "f4")],
  },
  {
    id: "tpl-onboarding",
    name: "Onboarding de Cliente",
    description: "Fluxo de onboarding com coleta de dados e boas-vindas.",
    category: "Customer Success",
    icon: "🚀",
    tags: ["onboarding", "cs", "cliente"],
    nodes: [
      nd("o1", "Novo Contato", "trigger", "👤", "Novo cliente cadastrado", "#22c55e", {}, pos(50, 200), "trigger_new_contact"),
      nd("o2", "Send Message", "output", "💬", "Mensagem de boas-vindas", "#06b6d4", { message: "Bem-vindo!" }, pos(350, 200), "send_message"),
      nd("o3", "Capturar Necessidade", "data_capture", "❓", "O que precisa resolver?", "#10b981", { prompt: "Qual sua principal necessidade?", variable: "need" }, pos(650, 200), "capture_need"),
      nd("o4", "Criar Tarefa", "crm_actions", "📝", "Cria tarefa de setup", "#f97316", { title: "Setup do cliente" }, pos(950, 200), "crm_create_task"),
    ],
    edges: [ed("o1", "o2"), ed("o2", "o3"), ed("o3", "o4")],
  },
  {
    id: "tpl-faq",
    name: "FAQ Inteligente",
    description: "Responde perguntas frequentes usando base de conhecimento.",
    category: "Suporte",
    icon: "❓",
    tags: ["faq", "suporte", "knowledge"],
    nodes: [
      nd("fq1", "Chat", "trigger", "💬", "Pergunta recebida", "#22c55e", { channel: "any" }, pos(50, 200), "trigger_chat"),
      nd("fq2", "RAG Search", "knowledge", "🔎", "Busca na base", "#a855f7", { collection: "faq", topK: 3 }, pos(350, 200), "rag_search"),
      nd("fq3", "Agent", "processing", "🤖", "Gera resposta", "#6366f1", { model: "gemini-2.5-flash" }, pos(650, 200), "agent"),
      nd("fq4", "Response", "output", "📤", "Envia resposta", "#06b6d4", { format: "text" }, pos(950, 200), "response"),
    ],
    edges: [ed("fq1", "fq2"), ed("fq2", "fq3"), ed("fq3", "fq4")],
  },
];
