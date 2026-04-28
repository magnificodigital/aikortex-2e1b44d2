// ── Agent Builder Wizard Types (Simplified 3-step flow) ──

export type WizardStep = "agent" | "context" | "channels" | "integrations" | "launch";

export const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: "agent", label: "Agente" },
  { key: "context", label: "Empresa" },
  { key: "channels", label: "Canais" },
  { key: "integrations", label: "Integrações" },
  { key: "launch", label: "Ativar" },
];

// ── Data Types ──

export type AgentType = "SDR" | "BDR" | "SAC" | "CS" | "Custom";

export interface AgentRecommendation {
  id: string;
  type: AgentType;
  name: string;
  objective: string;
  targetAudience: string;
  benefits: string[];
  exampleConversation: { role: "customer" | "agent"; message: string }[];
  selected: boolean;
}

export const AGENT_TEMPLATES: AgentRecommendation[] = [
  {
    id: "sdr-1",
    type: "SDR",
    name: "Agente SDR",
    objective: "Qualificar leads inbound e agendar reuniões com o time comercial.",
    targetAudience: "Leads inbound interessados",
    benefits: ["Qualificação 24/7", "60% menos tempo de resposta", "+35% conversão"],
    exampleConversation: [
      { role: "agent", message: "Olá! Vi que você demonstrou interesse. Posso te ajudar?" },
      { role: "customer", message: "Sim, gostaria de saber mais sobre os planos." },
    ],
    selected: false,
  },
  {
    id: "bdr-1",
    type: "BDR",
    name: "Agente BDR",
    objective: "Prospectar leads e gerar oportunidades via abordagem outbound.",
    targetAudience: "Empresas-alvo para prospecção",
    benefits: ["Prospecção em escala", "Abordagem personalizada", "Pipeline alimentado"],
    exampleConversation: [
      { role: "agent", message: "Oi! Notei que sua empresa pode se beneficiar da nossa solução." },
      { role: "customer", message: "Interessante, como funciona?" },
    ],
    selected: false,
  },
  {
    id: "sac-1",
    type: "SAC",
    name: "Agente SAC",
    objective: "Atender clientes, resolver problemas e fornecer suporte automatizado.",
    targetAudience: "Clientes ativos",
    benefits: ["Atendimento 24/7", "70% menos tickets", "CSAT elevado"],
    exampleConversation: [
      { role: "customer", message: "Estou com dificuldade para acessar minha conta." },
      { role: "agent", message: "Vou te ajudar agora! Pode me informar o email cadastrado?" },
    ],
    selected: false,
  },
  {
    id: "cs-1",
    type: "CS",
    name: "Agente CS",
    objective: "Garantir o sucesso dos clientes com follow-ups e feedbacks.",
    targetAudience: "Clientes em onboarding e pós-venda",
    benefits: ["Onboarding automático", "-40% churn", "Feedback contínuo"],
    exampleConversation: [
      { role: "agent", message: "Como tem sido sua experiência? Estou aqui para ajudar!" },
      { role: "customer", message: "Tenho dúvidas sobre uma funcionalidade." },
    ],
    selected: false,
  },
  {
    id: "custom-1",
    type: "Custom",
    name: "Agente Personalizado",
    objective: "Configure um agente sob medida com objetivos, canais e integrações livres.",
    targetAudience: "Definido por você",
    benefits: ["100% configurável", "Todos os canais disponíveis", "Todas as integrações"],
    exampleConversation: [
      { role: "agent", message: "Olá! Como posso te ajudar hoje?" },
      { role: "customer", message: "Preciso de uma solução específica para meu negócio." },
    ],
    selected: false,
  },
];

export interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface BusinessContext {
  // Empresa
  companyName: string;
  website: string;
  industry: string;
  mainProduct: string;
  country: string;
  language: string;
  // Agente
  agentName: string;
  // Serviços
  services: string[];
  // Público-alvo
  targetAudienceDescription: string;
  painPoints: string;
  // Base de conhecimento
  knowledgeSources: string;
  faqUrl: string;
  knowledgeFiles: KnowledgeFile[];
  // Tom e comportamento
  toneOfVoice: string;
  greetingMessage: string;
  // Skills
  skills: string[];
  // Operacional
  businessHours: string;
  escalationRules: string;
  averageTicket: string;
}

export const INITIAL_CONTEXT: BusinessContext = {
  companyName: "",
  website: "",
  industry: "",
  mainProduct: "",
  country: "Brasil",
  language: "Português",
  agentName: "",
  services: [],
  targetAudienceDescription: "",
  painPoints: "",
  knowledgeSources: "",
  faqUrl: "",
  knowledgeFiles: [],
  toneOfVoice: "Profissional e amigável",
  greetingMessage: "",
  skills: [],
  businessHours: "24/7",
  escalationRules: "",
  averageTicket: "",
};

export type AgentGoal =
  | "schedule_meetings"
  | "capture_leads"
  | "answer_questions"
  | "qualify_opportunities"
  | "support_customers"
  | "resolve_tickets"
  | "onboard_customers"
  | "collect_feedback"
  | "reduce_churn";

export const AGENT_GOALS: { value: AgentGoal; label: string; description: string }[] = [
  { value: "schedule_meetings", label: "Agendar reuniões", description: "Qualificar e agendar reuniões com leads" },
  { value: "capture_leads", label: "Capturar leads", description: "Coletar informações de contato e interesse" },
  { value: "answer_questions", label: "Responder perguntas", description: "Atendimento e suporte ao cliente" },
  { value: "qualify_opportunities", label: "Qualificar oportunidades", description: "Identificar leads com potencial de compra" },
  { value: "support_customers", label: "Suporte a clientes", description: "Acompanhamento e sucesso do cliente" },
  { value: "resolve_tickets", label: "Resolver chamados", description: "Solucionar problemas e dúvidas de clientes" },
  { value: "onboard_customers", label: "Onboarding", description: "Guiar novos clientes na adoção do produto" },
  { value: "collect_feedback", label: "Coletar feedback", description: "Pesquisas de satisfação e NPS" },
  { value: "reduce_churn", label: "Reduzir churn", description: "Identificar e reter clientes em risco" },
];

export const GOALS_BY_AGENT_TYPE: Record<AgentType, AgentGoal[]> = {
  SDR: ["capture_leads", "qualify_opportunities", "schedule_meetings"],
  BDR: ["qualify_opportunities", "schedule_meetings", "capture_leads"],
  SAC: ["answer_questions", "resolve_tickets", "collect_feedback"],
  CS: ["onboard_customers", "support_customers", "reduce_churn", "collect_feedback"],
  Custom: ["schedule_meetings", "capture_leads", "answer_questions", "qualify_opportunities", "support_customers", "resolve_tickets", "onboard_customers", "collect_feedback", "reduce_churn"],
};

export interface ConversationStep {
  id: string;
  label: string;
  content: string;
}

export interface QualificationTier {
  id: string;
  name: string;
  description: string;
  color: string;
}

export const DEFAULT_QUALIFICATION_TIERS: QualificationTier[] = [
  { id: "passive", name: "Lead Passivo", description: "Interessado mas sem dor ou urgência clara.", color: "bg-muted text-muted-foreground" },
  { id: "not_target", name: "Não é Target", description: "Não se encaixa no perfil de cliente ideal.", color: "bg-destructive/10 text-destructive" },
  { id: "potential", name: "Cliente Potencial", description: "Mostra interesse mas sem budget ou timeline definidos.", color: "bg-warning/10 text-warning" },
  { id: "qualified", name: "Lead Qualificado", description: "Dor clara e alinhamento de budget.", color: "bg-info/10 text-info" },
  { id: "sal", name: "Sales Accepted Lead", description: "Totalmente qualificado e pronto para contato comercial.", color: "bg-success/10 text-success" },
];

// ── Agent Intent System ──

export interface AgentIntent {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  action: string;
  isMandatory: boolean;
}

export const MANDATORY_INTENTS: AgentIntent[] = [
  {
    id: "end_conversation",
    name: "Encerrar conversa",
    description: "Quando o cliente finaliza, agradece ou a conversa é concluída.",
    triggers: ["cliente finaliza", "cliente agradece", "conversa concluída"],
    action: "Encerrar atendimento",
    isMandatory: true,
  },
  {
    id: "transfer_human",
    name: "Transferir para humano",
    description: "Quando o cliente pede humano, IA não resolve ou assunto sensível.",
    triggers: ["cliente pede humano", "IA não resolve", "assunto sensível"],
    action: "Transferir para atendente humano",
    isMandatory: true,
  },
  {
    id: "invalid_content",
    name: "Conteúdo inválido",
    description: "Quando o usuário envia vídeo, arquivo não suportado ou conteúdo não interpretável.",
    triggers: ["vídeo enviado", "arquivo não suportado", "conteúdo não interpretável"],
    action: "Informar limitação e oferecer transferência",
    isMandatory: true,
  },
  {
    id: "response_limit",
    name: "Limite de respostas atingido",
    description: "Quando o agente atinge o máximo de respostas sem resolver.",
    triggers: ["limite de respostas", "não consegue resolver"],
    action: "Transferir para humano",
    isMandatory: true,
  },
];

export const CUSTOM_INTENT_SUGGESTIONS: { name: string; action: string }[] = [
  { name: "Agendar reunião", action: "Criar agendamento" },
  { name: "Solicitar dados do cliente", action: "Coletar informações" },
  { name: "Enviar link", action: "Compartilhar link relevante" },
  { name: "Consultar base de conhecimento", action: "Buscar na base" },
  { name: "Criar ticket", action: "Abrir chamado no sistema" },
  { name: "Encaminhar setor", action: "Direcionar para departamento" },
  { name: "Enviar proposta", action: "Gerar e enviar proposta" },
  { name: "Registrar interesse", action: "Salvar lead no CRM" },
  { name: "Abrir atendimento", action: "Iniciar novo atendimento" },
  { name: "Qualificar lead", action: "Aplicar critérios de qualificação" },
];

// ── Conversation Stages ──

export interface ConversationStage {
  id: string;
  name: string;
  description: string;
  example: string;
  order: number;
}

export const DEFAULT_CONVERSATION_STAGES: ConversationStage[] = [
  { id: "greeting", name: "Saudação", description: "Apresentar o agente de forma cordial.", example: "Olá! Eu sou a Ivy, assistente virtual da empresa X. Como posso te ajudar hoje?", order: 1 },
  { id: "identification", name: "Identificação", description: "Coletar dados básicos: nome, empresa, interesse.", example: "Para te atender melhor, pode me dizer seu nome e empresa?", order: 2 },
  { id: "understanding", name: "Entendimento da necessidade", description: "Perguntar ao usuário qual é sua necessidade ou problema.", example: "Me conta mais sobre o que você precisa resolver.", order: 3 },
  { id: "qualification", name: "Qualificação", description: "Identificar se o cliente tem potencial para avançar.", example: "Quantas pessoas tem na sua equipe? Já usam alguma solução similar?", order: 4 },
  { id: "solution", name: "Apresentação da solução", description: "Apresentar solução ou direcionamento.", example: "Com base no que me contou, a solução ideal seria...", order: 5 },
  { id: "next_step", name: "Próximo passo", description: "Agendar reunião, enviar proposta ou encaminhar.", example: "Posso agendar uma conversa de 15 min com nosso especialista?", order: 6 },
  { id: "closing", name: "Encerramento", description: "Finalizar conversa de forma educada.", example: "Foi um prazer te atender! Qualquer dúvida, estou por aqui.", order: 7 },
];

// ── Advanced Config ──

export type MessageSize = "short" | "medium" | "long";
export type CreativityLevel = "none" | "restricted" | "creative";

export interface AgentAdvancedConfig {
  maxResponses: number;
  messageSize: MessageSize;
  minResponseTime: number;
  respondOnTransfer: boolean;
  respondInAudio: boolean;
  creativity: CreativityLevel;
}

export const DEFAULT_ADVANCED_CONFIG: AgentAdvancedConfig = {
  maxResponses: 50,
  messageSize: "medium",
  minResponseTime: 8,
  respondOnTransfer: false,
  respondInAudio: false,
  creativity: "restricted",
};

export interface AgentProfile {
  persona: string;
  primaryGoal: string;
  conversationFlow: string;
  instructions: string;
  communicationStyle: string;
  safetyGuidelines: string;
  constraints: string;
}

export type DeployChannel = "whatsapp" | "instagram" | "tiktok" | "facebook" | "linkedin" | "google_maps" | "website" | "email";

export const DEPLOY_CHANNELS: { value: DeployChannel; label: string; icon: string }[] = [
  { value: "whatsapp", label: "WhatsApp", icon: "📱" },
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "facebook", label: "Facebook", icon: "👤" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "google_maps", label: "Google Maps", icon: "📍" },
  { value: "website", label: "Website Chat", icon: "🌐" },
  { value: "email", label: "Email", icon: "📧" },
];

export type ExternalTool = "google_calendar" | "outlook" | "piperun" | "rd_station" | "crm_generic" | "openai" | "elevenlabs" | "gemini" | "anthropic" | "deepseek";

export const EXTERNAL_TOOLS: { value: ExternalTool; label: string; logo: string; description: string }[] = [
  { value: "google_calendar", label: "Google Agenda", logo: "https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png", description: "Agendar reuniões e compromissos" },
  { value: "outlook", label: "Outlook", logo: "https://img.icons8.com/color/48/microsoft-outlook-2019.png", description: "Calendário e e-mails Microsoft" },
  { value: "piperun", label: "PipeRun", logo: "/logos/piperun.png", description: "CRM e gestão de vendas" },
  { value: "rd_station", label: "RD Station", logo: "/logos/rdstation.png", description: "Marketing e automação" },
  { value: "crm_generic", label: "HubSpot", logo: "/logos/hubspot.png", description: "CRM e automação de vendas" },
  { value: "openai", label: "OpenAI", logo: "/logos/openai.png", description: "GPT e modelos de linguagem" },
  { value: "elevenlabs", label: "ElevenLabs", logo: "/logos/elevenlabs.png", description: "Voz IA e text-to-speech" },
  { value: "gemini", label: "Google Gemini", logo: "/logos/gemini.png", description: "IA multimodal do Google" },
  { value: "anthropic", label: "Anthropic", logo: "/logos/anthropic.png", description: "Claude e modelos de IA seguros" },
  { value: "deepseek", label: "DeepSeek", logo: "/logos/deepseek.png", description: "Modelos de IA open-source" },
];

// ── Agent-type specific mappings ──

export const CHANNELS_BY_AGENT_TYPE: Record<AgentType, DeployChannel[]> = {
  SDR: ["whatsapp", "instagram", "website", "email"],
  BDR: ["linkedin", "google_maps", "email"],
  SAC: ["whatsapp", "instagram", "facebook", "website", "email"],
  CS: ["whatsapp", "email", "website"],
  Custom: ["whatsapp", "instagram", "tiktok", "facebook", "linkedin", "google_maps", "website", "email"],
};

export const TOOLS_BY_AGENT_TYPE: Record<AgentType, ExternalTool[]> = {
  SDR: ["piperun", "rd_station", "crm_generic", "google_calendar", "outlook"],
  BDR: ["piperun", "rd_station", "crm_generic", "google_calendar", "outlook", "openai", "gemini"],
  SAC: ["openai", "gemini", "anthropic", "deepseek", "elevenlabs", "crm_generic"],
  CS: ["crm_generic", "piperun", "openai", "google_calendar", "outlook"],
  Custom: ["google_calendar", "outlook", "piperun", "rd_station", "crm_generic", "openai", "elevenlabs", "gemini", "anthropic", "deepseek"],
};

export type CRMProvider = "hubspot" | "pipedrive" | "zoho" | "salesforce" | "activecampaign" | "zendesk";

export const CRM_PROVIDERS: { value: CRMProvider; label: string }[] = [
  { value: "hubspot", label: "HubSpot" },
  { value: "pipedrive", label: "Pipedrive" },
  { value: "zoho", label: "Zoho CRM" },
  { value: "salesforce", label: "Salesforce" },
  { value: "activecampaign", label: "ActiveCampaign" },
  { value: "zendesk", label: "Zendesk Sell" },
];

export interface WizardState {
  step: WizardStep;
  context: BusinessContext;
  recommendations: AgentRecommendation[];
  selectedGoal: AgentGoal | null;
  conversationSteps: ConversationStep[];
  qualificationTiers: QualificationTier[];
  agentProfile: AgentProfile | null;
  selectedChannels: DeployChannel[];
  selectedCRM: CRMProvider | null;
}

// ── Mock generators ──

export function generateMockRecommendations(ctx: BusinessContext): AgentRecommendation[] {
  return AGENT_TEMPLATES.map((t) => ({
    ...t,
    name: `${t.type} Agent — ${ctx.companyName}`,
    targetAudience: t.type === "BDR" ? `Empresas do setor de ${ctx.industry}` : t.targetAudience,
    exampleConversation: [
      { role: "agent" as const, message: `Olá! Sou o assistente da ${ctx.companyName}. ${t.exampleConversation[0]?.message || ""}` },
      ...t.exampleConversation.slice(1),
    ],
  }));
}

export function generateMockConversation(ctx: BusinessContext, goal: AgentGoal): ConversationStep[] {
  return [
    { id: "1", label: "Saudação", content: `Olá! Sou o assistente virtual da ${ctx.companyName}. Posso te ajudar a conhecer mais sobre ${ctx.mainProduct}?` },
    { id: "2", label: "Descoberta", content: "Que ótimo! Para te recomendar a melhor solução, pode me contar um pouco sobre seu negócio e principais desafios?" },
    { id: "3", label: "Qualificação", content: "Para entender se faz sentido pra vocês, pode me dizer qual é o tamanho da sua equipe e o budget disponível?" },
    { id: "4", label: "Fechamento", content: goal === "schedule_meetings"
      ? "Que tal agendarmos uma conversa de 15 minutos com nosso especialista?"
      : "Posso enviar uma proposta personalizada para você avaliar?" },
  ];
}

export function generateMockProfile(ctx: BusinessContext, goal: AgentGoal): AgentProfile {
  return {
    persona: `Assistente virtual profissional da ${ctx.companyName}, especialista em ${ctx.industry}. Tom consultivo, amigável e direto.`,
    primaryGoal: AGENT_GOALS.find((g) => g.value === goal)?.description || "",
    conversationFlow: "Saudação → Descoberta → Qualificação → Proposta de Valor → Fechamento",
    instructions: `1. Sempre se apresentar como assistente da ${ctx.companyName}\n2. Focar em entender as necessidades do lead\n3. Qualificar usando critérios BANT\n4. Nunca prometer o que não pode cumprir\n5. Direcionar para próximo passo claro`,
    communicationStyle: `Profissional e consultivo. Linguagem em ${ctx.language}. Respostas curtas e objetivas.`,
    safetyGuidelines: "Não compartilhar informações confidenciais. Encaminhar para humano em casos sensíveis.",
    constraints: `Horário: 24/7. Idioma: ${ctx.language}. Escopo: ${ctx.mainProduct}.`,
  };
}
