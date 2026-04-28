import {
  AgentType,
  AgentIntent,
  MANDATORY_INTENTS,
  ConversationStage,
  AgentAdvancedConfig,
  DEFAULT_ADVANCED_CONFIG,
  BusinessContext,
  INITIAL_CONTEXT,
} from "./agent-builder";

interface AgentPreset {
  context: Partial<BusinessContext>;
  intents: AgentIntent[];
  stages: ConversationStage[];
  advancedConfig: AgentAdvancedConfig;
}

const SDR_INTENTS: AgentIntent[] = [
  ...MANDATORY_INTENTS,
  { id: "schedule_meeting", name: "Agendar reunião", description: "Quando o lead demonstra interesse em conhecer a solução", triggers: ["quer agendar", "interesse em reunião", "quero saber mais"], action: "Criar agendamento com o time comercial", isMandatory: false },
  { id: "qualify_lead", name: "Qualificar lead", description: "Identificar perfil, budget e timeline do lead", triggers: ["interesse em comprar", "precisa de solução", "buscando alternativa"], action: "Aplicar critérios BANT de qualificação", isMandatory: false },
  { id: "capture_contact", name: "Capturar dados de contato", description: "Coletar email, telefone e empresa do lead", triggers: ["início de conversa", "interesse demonstrado"], action: "Solicitar informações de contato", isMandatory: false },
  { id: "send_material", name: "Enviar material", description: "Compartilhar apresentações, cases ou propostas", triggers: ["quer ver material", "tem case?", "como funciona?"], action: "Enviar link de material relevante", isMandatory: false },
];

const BDR_INTENTS: AgentIntent[] = [
  ...MANDATORY_INTENTS,
  { id: "prospect_outreach", name: "Abordagem de prospecção", description: "Iniciar contato com empresas-alvo", triggers: ["primeiro contato", "outbound"], action: "Enviar mensagem de prospecção personalizada", isMandatory: false },
  { id: "schedule_meeting", name: "Agendar reunião", description: "Converter interesse em reunião qualificada", triggers: ["quer saber mais", "tem interesse"], action: "Criar agendamento", isMandatory: false },
  { id: "research_company", name: "Pesquisar empresa", description: "Buscar informações sobre a empresa-alvo", triggers: ["novo lead", "empresa desconhecida"], action: "Consultar base de dados da empresa", isMandatory: false },
  { id: "register_interest", name: "Registrar interesse", description: "Salvar lead no CRM com informações coletadas", triggers: ["lead qualificado", "interesse confirmado"], action: "Registrar lead no pipeline", isMandatory: false },
];

const SAC_INTENTS: AgentIntent[] = [
  ...MANDATORY_INTENTS,
  { id: "resolve_ticket", name: "Resolver chamado", description: "Solucionar problemas técnicos ou dúvidas", triggers: ["problema com produto", "não funciona", "erro"], action: "Diagnosticar e resolver o problema", isMandatory: false },
  { id: "open_ticket", name: "Abrir chamado", description: "Criar ticket para acompanhamento", triggers: ["problema complexo", "precisa de suporte técnico"], action: "Abrir chamado no sistema", isMandatory: false },
  { id: "check_status", name: "Consultar status", description: "Verificar andamento de um chamado existente", triggers: ["meu chamado", "status do pedido", "andamento"], action: "Buscar status no sistema", isMandatory: false },
  { id: "collect_feedback", name: "Coletar feedback", description: "Pesquisa de satisfação após atendimento", triggers: ["atendimento concluído", "problema resolvido"], action: "Enviar pesquisa de satisfação", isMandatory: false },
  { id: "route_department", name: "Encaminhar setor", description: "Direcionar para departamento específico", triggers: ["financeiro", "comercial", "técnico", "outro setor"], action: "Transferir para o departamento correto", isMandatory: false },
];

const CS_INTENTS: AgentIntent[] = [
  ...MANDATORY_INTENTS,
  { id: "onboarding_guide", name: "Guiar onboarding", description: "Acompanhar o cliente nos primeiros passos", triggers: ["novo cliente", "como começo?", "primeiro acesso"], action: "Enviar guia de onboarding passo a passo", isMandatory: false },
  { id: "health_check", name: "Health check", description: "Verificar nível de uso e satisfação do cliente", triggers: ["check-in periódico", "revisão mensal"], action: "Realizar pesquisa de uso e satisfação", isMandatory: false },
  { id: "collect_feedback", name: "Coletar feedback", description: "NPS e pesquisas de satisfação", triggers: ["ciclo de feedback", "avaliação"], action: "Enviar pesquisa NPS", isMandatory: false },
  { id: "prevent_churn", name: "Prevenir churn", description: "Identificar sinais de risco e agir proativamente", triggers: ["baixo uso", "reclamação recorrente", "cancelamento"], action: "Acionar plano de retenção", isMandatory: false },
  { id: "upsell", name: "Expansão de conta", description: "Identificar oportunidades de upsell/cross-sell", triggers: ["uso alto", "nova necessidade", "crescimento"], action: "Apresentar plano superior ou módulos adicionais", isMandatory: false },
];

const SDR_STAGES: ConversationStage[] = [
  { id: "s1", name: "Saudação", description: "Apresentar-se e criar conexão com o lead.", example: "Olá! Sou a assistente virtual da [Empresa]. Vi que você demonstrou interesse — posso te ajudar!", order: 1 },
  { id: "s2", name: "Identificação", description: "Coletar nome, empresa e cargo.", example: "Para te atender melhor, pode me dizer seu nome e empresa?", order: 2 },
  { id: "s3", name: "Descoberta de necessidade", description: "Entender qual problema o lead quer resolver.", example: "Qual é o principal desafio que você enfrenta hoje nessa área?", order: 3 },
  { id: "s4", name: "Qualificação BANT", description: "Avaliar Budget, Autoridade, Necessidade e Timeline.", example: "Vocês já têm budget definido para esse tipo de solução? Qual o prazo ideal?", order: 4 },
  { id: "s5", name: "Apresentação de valor", description: "Conectar a dor do lead com a solução oferecida.", example: "Entendi! Nossa solução resolve exatamente isso. Empresas como a [Case] tiveram [resultado].", order: 5 },
  { id: "s6", name: "Agendamento", description: "Propor reunião com o time comercial.", example: "Que tal agendarmos 15 min com nosso especialista? Posso ver a disponibilidade agora.", order: 6 },
  { id: "s7", name: "Encerramento", description: "Confirmar próximos passos e despedida.", example: "Perfeito! Reunião confirmada. Enviarei o convite por email. Até lá! 😊", order: 7 },
];

const BDR_STAGES: ConversationStage[] = [
  { id: "s1", name: "Abordagem inicial", description: "Primeiro contato personalizado com a empresa-alvo.", example: "Olá! Notei que a [Empresa] atua em [setor] e acredito que podemos agregar valor.", order: 1 },
  { id: "s2", name: "Contexto e relevância", description: "Mostrar que entende o mercado do prospect.", example: "Empresas do seu setor têm enfrentado [desafio]. Vocês também?", order: 2 },
  { id: "s3", name: "Proposta de valor", description: "Apresentar benefício claro e tangível.", example: "Ajudamos empresas como a [Case] a [resultado específico].", order: 3 },
  { id: "s4", name: "Qualificação", description: "Verificar fit e interesse.", example: "Faz sentido pra vocês? Qual é a prioridade de vocês nesse momento?", order: 4 },
  { id: "s5", name: "Agendamento", description: "Converter interesse em reunião.", example: "Posso agendar 15 min com nosso especialista para aprofundar?", order: 5 },
  { id: "s6", name: "Encerramento", description: "Confirmar e despedir.", example: "Reunião agendada! Envio o convite agora. Até breve!", order: 6 },
];

const SAC_STAGES: ConversationStage[] = [
  { id: "s1", name: "Saudação", description: "Receber o cliente de forma acolhedora.", example: "Olá! Bem-vindo ao suporte da [Empresa]. Como posso te ajudar?", order: 1 },
  { id: "s2", name: "Identificação do cliente", description: "Confirmar dados do cliente e contrato.", example: "Pode me informar seu email ou número de conta?", order: 2 },
  { id: "s3", name: "Entendimento do problema", description: "Ouvir e diagnosticar a situação.", example: "Entendi. Pode me descrever com mais detalhes o que está acontecendo?", order: 3 },
  { id: "s4", name: "Resolução", description: "Aplicar solução ou escalar.", example: "Vou resolver isso agora! [Ação]. Pode verificar se funcionou?", order: 4 },
  { id: "s5", name: "Confirmação", description: "Verificar se o problema foi resolvido.", example: "O problema foi resolvido? Posso ajudar com mais alguma coisa?", order: 5 },
  { id: "s6", name: "Pesquisa de satisfação", description: "Coletar feedback sobre o atendimento.", example: "De 1 a 5, como avalia este atendimento?", order: 6 },
  { id: "s7", name: "Encerramento", description: "Despedida cordial.", example: "Obrigado pelo contato! Estamos sempre à disposição. 😊", order: 7 },
];

const CS_STAGES: ConversationStage[] = [
  { id: "s1", name: "Boas-vindas", description: "Receber o cliente de forma proativa.", example: "Olá! Sou sua consultora de sucesso na [Empresa]. Como tem sido sua experiência?", order: 1 },
  { id: "s2", name: "Check-in de uso", description: "Verificar nível de adoção e uso da plataforma.", example: "Vi que vocês estão usando [funcionalidade]. Já conhecem [recurso X]?", order: 2 },
  { id: "s3", name: "Identificação de dores", description: "Entender pontos de fricção.", example: "Existe algo que poderia funcionar melhor para vocês?", order: 3 },
  { id: "s4", name: "Orientação e treinamento", description: "Oferecer dicas e guias relevantes.", example: "Recomendo assistir [tutorial]. Muitos clientes melhoram [métrica] com isso.", order: 4 },
  { id: "s5", name: "Próximos passos", description: "Definir ações de acompanhamento.", example: "Vou agendar um check-in para daqui 30 dias. Posso te ajudar com mais algo?", order: 5 },
  { id: "s6", name: "Encerramento", description: "Despedida com reforço de disponibilidade.", example: "Conta comigo sempre! Qualquer dúvida, estou por aqui. 🚀", order: 6 },
];

export const AGENT_PRESETS: Record<AgentType, AgentPreset> = {
  SDR: {
    context: {
      mainProduct: "SDR",
      toneOfVoice: "Profissional e amigável",
      targetAudienceDescription: "Este agente qualifica leads inbound, identifica necessidades, aplica critérios BANT e agenda reuniões com o time comercial.",
      painPoints: "Lead qualificado com reunião agendada no calendário do closer.",
      knowledgeSources: "Leads inbound que demonstraram interesse via site, formulários, landing pages ou anúncios.",
      greetingMessage: "Olá! 👋 Sou a assistente virtual da [Empresa]. Vi que você demonstrou interesse — posso te ajudar a conhecer nossa solução?",
    },
    intents: SDR_INTENTS,
    stages: SDR_STAGES,
    advancedConfig: { ...DEFAULT_ADVANCED_CONFIG, maxResponses: 50, messageSize: "short", minResponseTime: 5, creativity: "restricted" },
  },
  BDR: {
    context: {
      mainProduct: "BDR",
      toneOfVoice: "Consultivo e técnico",
      targetAudienceDescription: "Este agente prospecta empresas-alvo via outbound, gera interesse e agenda reuniões qualificadas com o time de vendas.",
      painPoints: "Reunião agendada com decisor de empresa-alvo qualificada.",
      knowledgeSources: "Empresas-alvo para prospecção outbound, decisores C-level e gerentes.",
      greetingMessage: "Olá! Notei que a [Empresa do prospect] atua em [setor] e acredito que podemos agregar muito valor ao seu negócio.",
    },
    intents: BDR_INTENTS,
    stages: BDR_STAGES,
    advancedConfig: { ...DEFAULT_ADVANCED_CONFIG, maxResponses: 40, messageSize: "medium", minResponseTime: 8, creativity: "restricted" },
  },
  SAC: {
    context: {
      mainProduct: "Atendente de Suporte",
      toneOfVoice: "Empático e acolhedor",
      targetAudienceDescription: "Este agente atende clientes ativos, resolve problemas, responde dúvidas e garante satisfação no suporte.",
      painPoints: "Problema resolvido com satisfação do cliente (CSAT alto).",
      knowledgeSources: "Clientes ativos com dúvidas, problemas técnicos ou solicitações de suporte.",
      greetingMessage: "Olá! 👋 Bem-vindo ao suporte da [Empresa]. Estou aqui para te ajudar. Como posso te atender?",
    },
    intents: SAC_INTENTS,
    stages: SAC_STAGES,
    advancedConfig: { ...DEFAULT_ADVANCED_CONFIG, maxResponses: 80, messageSize: "medium", minResponseTime: 3, creativity: "none", respondOnTransfer: true },
  },
  CS: {
    context: {
      mainProduct: "Customer Success",
      toneOfVoice: "Profissional e amigável",
      targetAudienceDescription: "Este agente acompanha clientes em onboarding e pós-venda, garantindo adoção, satisfação e retenção.",
      painPoints: "Cliente ativo, engajado e com alto nível de adoção do produto.",
      knowledgeSources: "Clientes em onboarding, pós-venda e renovação de contrato.",
      greetingMessage: "Olá! 😊 Sou sua consultora de sucesso na [Empresa]. Como tem sido sua experiência até aqui?",
    },
    intents: CS_INTENTS,
    stages: CS_STAGES,
    advancedConfig: { ...DEFAULT_ADVANCED_CONFIG, maxResponses: 60, messageSize: "medium", minResponseTime: 5, creativity: "restricted" },
  },
  Custom: {
    context: {},
    intents: [...MANDATORY_INTENTS],
    stages: [
      { id: "s1", name: "Saudação", description: "Apresentar o agente.", example: "Olá! Como posso te ajudar?", order: 1 },
      { id: "s2", name: "Entendimento", description: "Compreender a necessidade.", example: "Me conta mais sobre o que você precisa.", order: 2 },
      { id: "s3", name: "Resolução", description: "Oferecer solução ou direcionamento.", example: "Com base no que me contou, posso te ajudar assim...", order: 3 },
      { id: "s4", name: "Encerramento", description: "Finalizar a conversa.", example: "Foi um prazer te atender! Até mais.", order: 4 },
    ],
    advancedConfig: { ...DEFAULT_ADVANCED_CONFIG },
  },
};
