// Agent Construction Blueprint — fonte de verdade do que um agente "100% pronto"
// precisa ter por arquétipo. Lido pelo wizard pra:
//   1. Fazer perguntas direcionadas na fase Descoberta (foca no que falta)
//   2. Ativar deterministicamente capacidades+tools+conectores na fase Criação
//   3. Sugerir conhecimento+tabelas+cadências na mensagem final
//
// Quando criar um arquétipo novo (BDR, Recrutador, etc.), ADICIONE aqui.
// Master v7.4 §13.4 + §13.5 são a referência canônica.

export type Archetype = "SDR" | "SAC" | "CS" | "Content" | "Custom";

export type RuntimeTool =
  | "web_search"
  | "knowledge_search"
  | "image_gen"
  | "table_read"
  | "table_write";

export type Capability =
  | "reasoning"
  | "memory"
  | "planning"
  | "auto_integration"
  | "code_runtime";

export interface ConnectorHint {
  /** Regex que, se bater na descrição, indica que esse conector é provavelmente necessário */
  trigger: RegExp;
  /** Slug do provider (alinhado com PROVIDER_TO_TOOLKIT em composio.ts) */
  provider: string;
  /** Por que esse conector é sugerido (mostrado pro user) */
  reason: string;
}

export interface CadenceSuggestion {
  name: string;
  /** Quando dispara (ex: "Após qualificação", "Pós-resolução do ticket") */
  trigger: string;
  /** Sequência de passos com timing */
  steps: Array<{ delay: string; channel: "whatsapp" | "email"; goal: string }>;
}

export interface TableSuggestion {
  name: string;
  purpose: string;
  columns: string[];
}

export interface ArchetypeSpec {
  archetype: Archetype;
  label: string;
  focusBR: string;
  /** Capacidades cognitivas SEMPRE ativadas pra esse arquétipo */
  capabilities: Capability[];
  /** Tools runtime que faz sentido por padrão */
  runtimeTools: RuntimeTool[];
  /** Conectores Composio sugeridos por trigger na descrição */
  connectorHints: ConnectorHint[];
  /** Cadências sugeridas (user pode ativar/editar depois) */
  cadences: CadenceSuggestion[];
  /** Tipos de documento que devem ser pedidos pra Conhecimento */
  knowledgeDocs: string[];
  /** Tabelas que devem ser sugeridas */
  tables: TableSuggestion[];
  /** Perguntas obrigatórias da fase Descoberta, agrupadas por bloco */
  discoveryQuestions: {
    business: string[];
    audience: string[];
    behavior: string[];
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SDR — Qualifica leads inbound e marca reuniões
// ────────────────────────────────────────────────────────────────────────────

const SDR_SPEC: ArchetypeSpec = {
  archetype: "SDR",
  label: "SDR (Qualificação + Agendamento)",
  focusBR: "qualificar leads inbound e marcar reuniões com o time comercial",
  capabilities: ["reasoning", "memory", "planning", "auto_integration"],
  runtimeTools: ["table_write", "knowledge_search", "web_search"],
  connectorHints: [
    { trigger: /\b(google\s*calendar|google\s*agenda|calendly)\b/i, provider: "google_calendar", reason: "Agendamento das reuniões qualificadas" },
    { trigger: /\b(hubspot|rd\s*station|piperun|pipedrive)\b/i, provider: "hubspot", reason: "Registro do lead no CRM" },
    { trigger: /\b(gmail|email|e-mail)\b/i, provider: "gmail", reason: "Envio de confirmação de reunião" },
  ],
  cadences: [
    {
      name: "Follow-up de leads não respondidos",
      trigger: "Lead não respondeu em 24h após qualificação inicial",
      steps: [
        { delay: "24h", channel: "whatsapp", goal: "Lembrete leve com CTA pra responder" },
        { delay: "72h", channel: "whatsapp", goal: "Reforça valor e pergunta se há interesse" },
        { delay: "7d", channel: "whatsapp", goal: "Última tentativa antes de marcar como perdido" },
      ],
    },
    {
      name: "Confirmação pré-reunião",
      trigger: "1h antes do horário marcado",
      steps: [
        { delay: "1h antes", channel: "whatsapp", goal: "Confirma presença + envia link da call" },
      ],
    },
  ],
  knowledgeDocs: [
    "ICP (Ideal Customer Profile) e personas",
    "Catálogo de produtos/serviços e diferenciais",
    "Casos de sucesso e provas sociais",
    "Política de preços e descontos (pra responder objeções)",
  ],
  tables: [
    {
      name: "leads",
      purpose: "Registrar cada lead qualificado com BANT",
      columns: ["nome", "email", "telefone", "empresa", "cargo", "budget", "authority", "need", "timeline", "stage", "temperature", "next_action_at"],
    },
  ],
  discoveryQuestions: {
    business: [
      "Qual produto/serviço o SDR está vendendo?",
      "Qual o ICP (perfil de cliente ideal — porte, segmento, dor)?",
      "Qual o ticket médio e qual o ciclo de vendas?",
    ],
    audience: [
      "De onde os leads chegam (anúncios, site, indicação)?",
      "Que canal o lead prefere ser abordado (WhatsApp, Email)?",
      "Horário de atendimento e fuso horário?",
    ],
    behavior: [
      "Como classifica um lead bom (BANT, budget mínimo, autoridade)?",
      "O que faz quando lead NÃO se qualifica (descarta, nutre, escala)?",
      "Tem CRM ou planilha onde os leads devem entrar?",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// SAC — Atendimento e suporte pós-venda
// ────────────────────────────────────────────────────────────────────────────

const SAC_SPEC: ArchetypeSpec = {
  archetype: "SAC",
  label: "SAC (Atendimento + Suporte)",
  focusBR: "atender clientes, resolver dúvidas e suporte de pós-venda",
  capabilities: ["reasoning", "memory", "planning"],
  runtimeTools: ["knowledge_search", "table_read", "table_write"],
  connectorHints: [
    { trigger: /\b(hubspot|zendesk|freshdesk|movidesk)\b/i, provider: "hubspot", reason: "Registro de tickets no helpdesk" },
    { trigger: /\b(gmail|email|e-mail)\b/i, provider: "gmail", reason: "Resposta por email de tickets formais" },
  ],
  cadences: [
    {
      name: "Pesquisa de CSAT",
      trigger: "Ticket marcado como resolvido",
      steps: [
        { delay: "2h após resolução", channel: "whatsapp", goal: "Pergunta nota 1-5 + comentário opcional" },
      ],
    },
    {
      name: "Reabertura de tickets sem confirmação",
      trigger: "Cliente não confirmou resolução em 48h",
      steps: [
        { delay: "48h", channel: "whatsapp", goal: "Pergunta se problema persiste, oferece reabrir" },
      ],
    },
  ],
  knowledgeDocs: [
    "FAQ — perguntas mais frequentes com respostas oficiais",
    "Políticas (troca, devolução, garantia, SLA)",
    "Manual técnico do produto/serviço",
    "Templates de resposta por categoria de problema",
  ],
  tables: [
    {
      name: "tickets",
      purpose: "Histórico de atendimentos pra contexto + auditoria",
      columns: ["cliente", "email", "telefone", "categoria", "descricao", "status", "csat", "resolvido_em", "agente"],
    },
    {
      name: "clientes",
      purpose: "Base de clientes pra identificar histórico",
      columns: ["nome", "email", "telefone", "plano", "data_compra", "status"],
    },
  ],
  discoveryQuestions: {
    business: [
      "Qual produto/serviço o SAC dá suporte?",
      "Que tipo de problema mais comum os clientes têm hoje?",
      "Tem SLA definido (tempo de primeira resposta, tempo de resolução)?",
    ],
    audience: [
      "Quem são os clientes (consumidor final, empresa, ambos)?",
      "Canal preferido (WhatsApp, Email, ambos)?",
      "Horário de atendimento (24/7, comercial, fins de semana)?",
    ],
    behavior: [
      "O que JAMAIS o agente pode prometer/fazer (LGPD, sem prazo, sem desconto)?",
      "Quando escalar pra humano (sinais específicos de frustração, complexidade)?",
      "Tem FAQ ou base de conhecimento que eu posso usar?",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// CS — Customer Success
// ────────────────────────────────────────────────────────────────────────────

const CS_SPEC: ArchetypeSpec = {
  archetype: "CS",
  label: "CS (Customer Success)",
  focusBR: "garantir sucesso do cliente, follow-ups proativos e retenção",
  capabilities: ["reasoning", "memory", "planning", "auto_integration"],
  runtimeTools: ["knowledge_search", "table_read", "table_write"],
  connectorHints: [
    { trigger: /\b(hubspot|salesforce|pipedrive)\b/i, provider: "hubspot", reason: "Sync de health score e atividades" },
    { trigger: /\b(google\s*sheets|planilha)\b/i, provider: "google_sheets", reason: "Tracking de health score em planilha" },
    { trigger: /\b(slack)\b/i, provider: "slack", reason: "Alerta interno quando cliente vira churn risk" },
  ],
  cadences: [
    {
      name: "Check-in mensal",
      trigger: "30 dias após onboarding ou último check-in",
      steps: [
        { delay: "30d", channel: "whatsapp", goal: "Pergunta uso, satisfação, oferece treinamento" },
      ],
    },
    {
      name: "Alerta de churn risk",
      trigger: "Health score caiu abaixo de 50",
      steps: [
        { delay: "imediato", channel: "whatsapp", goal: "Reach-out proativo + agenda call de alinhamento" },
      ],
    },
  ],
  knowledgeDocs: [
    "Playbook de adoção e marcos de sucesso",
    "Materiais de treinamento e tutoriais",
    "Casos de uso por segmento de cliente",
    "Critérios de health score (uso, NPS, tickets)",
  ],
  tables: [
    {
      name: "contas",
      purpose: "Base de clientes ativos com health score",
      columns: ["empresa", "owner", "plano", "mrr", "health_score", "ultimo_contato", "proximo_milestone"],
    },
  ],
  discoveryQuestions: {
    business: [
      "Qual produto/serviço o CS dá suporte (SaaS, serviço recorrente)?",
      "Como é o ciclo de vida do cliente (onboarding, adoção, expansão)?",
      "O que define um cliente saudável vs em risco?",
    ],
    audience: [
      "Quem é o ponto de contato (decisor, usuário final)?",
      "Frequência ideal de check-in (semanal, mensal, trimestral)?",
      "Canal preferido pelos clientes pra check-in?",
    ],
    behavior: [
      "Quando o CS deve escalar internamente (churn risk, upsell oportunidade)?",
      "Tem playbooks/materiais que eu posso usar como base?",
      "Health score é calculado em algum sistema hoje?",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Content — Geração de conteúdo (posts, copy, criativos)
// ────────────────────────────────────────────────────────────────────────────

const CONTENT_SPEC: ArchetypeSpec = {
  archetype: "Content",
  label: "Conteúdo (Posts + Copy)",
  focusBR: "gerar posts, copy e criativos alinhados ao tom da marca",
  capabilities: ["reasoning", "memory", "auto_integration"],
  runtimeTools: ["web_search", "image_gen", "knowledge_search"],
  connectorHints: [
    { trigger: /\b(google\s*drive|drive)\b/i, provider: "google_drive", reason: "Armazenar criativos gerados" },
    { trigger: /\b(notion)\b/i, provider: "notion", reason: "Banco de pautas e calendário editorial" },
    { trigger: /\b(google\s*sheets|planilha)\b/i, provider: "google_sheets", reason: "Tracking de calendário editorial" },
  ],
  cadences: [],
  knowledgeDocs: [
    "Guia de marca (tom, voz, valores, palavras evitadas)",
    "Persona detalhada do público que consome o conteúdo",
    "Histórico de posts que performaram bem (referências)",
    "Briefings de campanhas e calendário editorial",
  ],
  tables: [
    {
      name: "calendario_editorial",
      purpose: "Pautas planejadas com status",
      columns: ["tema", "formato", "plataforma", "data_publicacao", "status", "responsavel", "performance"],
    },
  ],
  discoveryQuestions: {
    business: [
      "Qual marca/produto o conteúdo representa?",
      "Quais plataformas (Instagram, LinkedIn, blog, TikTok)?",
      "Que formatos (carrossel, vídeo, texto, imagem estática)?",
    ],
    audience: [
      "Quem é o público (idade, interesse, dor que resolve)?",
      "Tom desejado (formal, casual, irreverente, educativo)?",
    ],
    behavior: [
      "Tem guia de marca ou referências de tom que posso usar?",
      "Que temas NUNCA pode falar (política, religião, concorrentes)?",
      "Posts vão direto pro ar ou passam por aprovação?",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Custom — Fallback genérico (sem arquétipo claro)
// ────────────────────────────────────────────────────────────────────────────

const CUSTOM_SPEC: ArchetypeSpec = {
  archetype: "Custom",
  label: "Customizado",
  focusBR: "objetivo customizado a ser descoberto",
  capabilities: ["reasoning", "memory"],
  runtimeTools: ["knowledge_search"],
  connectorHints: [],
  cadences: [],
  knowledgeDocs: [
    "Documentos relevantes ao propósito do agente",
  ],
  tables: [],
  discoveryQuestions: {
    business: [
      "Qual a empresa e o que ela faz?",
      "Qual o propósito específico desse agente (o que ele FAZ no dia-a-dia)?",
    ],
    audience: [
      "Quem o agente atende (cliente final, time interno, fornecedor)?",
      "Canal principal (WhatsApp, Email, Site)?",
    ],
    behavior: [
      "Que limites/regras o agente DEVE respeitar?",
      "Quando escalar pra humano?",
      "Tem documentos/dados que eu deva usar como base?",
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Registry + detecção
// ────────────────────────────────────────────────────────────────────────────

const SPECS: Record<Archetype, ArchetypeSpec> = {
  SDR: SDR_SPEC,
  SAC: SAC_SPEC,
  CS: CS_SPEC,
  Content: CONTENT_SPEC,
  Custom: CUSTOM_SPEC,
};

export function getSpec(archetype: Archetype): ArchetypeSpec {
  return SPECS[archetype] ?? SPECS.Custom;
}

/**
 * Detecta o arquétipo a partir da descrição do user usando heurísticas de
 * verbos+contexto. Retorna Custom se não houver sinal claro.
 */
export function detectArchetype(description: string): Archetype {
  const d = description.toLowerCase();

  // SDR: qualifica + agenda, prospecta, gera reuniões
  if (/\b(qualifi[cq][ae]|qualifica[çc][ãa]o|sdr|bdr|agend[ae].*(reuni[ãa]o|reunia)|marcar reuni)\b/i.test(d)) {
    return "SDR";
  }
  if (/\b(lead|prospect).*(qualifi|agend|reuni|comerc)/i.test(d)) {
    return "SDR";
  }

  // SAC: atende, suporte, tira dúvida, resolve problema
  if (/\b(atend(e|imento|er)|suporte|sac|d[úu]vidas?|resolv|reclama|p[óo]s.?venda|p[óo]s.?compra)\b/i.test(d)) {
    return "SAC";
  }
  if (/\b(ticket|chamado|protocolo)\b/i.test(d)) {
    return "SAC";
  }

  // CS: customer success, retenção, churn, health
  if (/\b(customer success|cs |csm|reten[çc][ãa]o|churn|health score|onboarding)\b/i.test(d)) {
    return "CS";
  }

  // Content: cria, gera, escreve, post, copy
  if (/\b(criar|gerar|escrev|copy|post|conte[úu]do|legenda|carrossel|ideia)\b.*(instagram|linkedin|tiktok|blog|rede)/i.test(d)) {
    return "Content";
  }
  if (/\b(redator|copywrit|content|social media)\b/i.test(d)) {
    return "Content";
  }

  return "Custom";
}

/**
 * Resolve quais conectores a descrição implica, juntando hints do arquétipo
 * + qualquer integração mencionada explicitamente no texto.
 */
export function inferConnectors(spec: ArchetypeSpec, description: string): ConnectorHint[] {
  return spec.connectorHints.filter((h) => h.trigger.test(description));
}

/**
 * Bloco textual com perguntas direcionadas pra injetar no prompt da Descoberta.
 * Já considera o que o user mencionou na descrição pra não repetir.
 */
export function buildDiscoveryQuestionsBlock(
  spec: ArchetypeSpec,
  description: string,
  agencyName: string | null,
): string {
  const mentioned = {
    channel: /\b(whatsapp|email|e-mail|site|widget|instagram|telegram)\b/i.test(description),
    schedule: /\b(hor[áa]rio|24\/?7|comercial|seg.*sex)\b/i.test(description),
    crm: /\b(crm|hubspot|piperun|rd\s*station|pipedrive)\b/i.test(description),
    company: agencyName !== null,
  };

  const businessQs = spec.discoveryQuestions.business
    .filter((q) => !(mentioned.company && /empresa|nome.*empresa/i.test(q)));
  const audienceQs = spec.discoveryQuestions.audience
    .filter((q) => !(mentioned.channel && /canal|prefer/i.test(q)))
    .filter((q) => !(mentioned.schedule && /hor[áa]rio/i.test(q)));
  const behaviorQs = spec.discoveryQuestions.behavior;

  // Junta as 3-5 perguntas mais essenciais (uma de cada categoria + extras)
  const flat = [
    businessQs[0],
    audienceQs[0],
    behaviorQs[0],
    businessQs[1],
    audienceQs[1],
    behaviorQs[1],
  ].filter(Boolean).slice(0, 4);

  // 3 estilos rotativos — escolha pseudo-aleatória baseada no hash da descrição
  // (mesma descrição = mesmo estilo, mas descrições diferentes variam)
  const hash = description.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const style = hash % 3;

  if (style === 0) {
    // Estilo A — Lista numerada (vira cards no RichMarkdown)
    return flat.map((q, i) => `${i + 1}. ${q}`).join("\n");
  }

  if (style === 1) {
    // Estilo B — H2 com 1 pergunta por bloco
    const blocks = [
      { icon: "🎯", title: "O propósito", q: businessQs[0] },
      { icon: "📞", title: "O contato", q: audienceQs[0] },
      { icon: "🚧", title: "Os limites", q: behaviorQs[0] },
    ].filter((b) => b.q);
    return blocks.map((b) => `## ${b.icon} ${b.title}\n${b.q}`).join("\n\n");
  }

  // Estilo C — Bullets simples seguidos
  return flat.map((q) => `- ${q}`).join("\n");
}

/**
 * Próximos passos textuais (KB + Tabelas + Cadências) pra appendar na mensagem
 * final depois da fase Criação.
 */
export function buildNextStepsBlock(spec: ArchetypeSpec): string {
  // Formato compacto e escaneável. Cada bloco em uma linha curta.
  const lines: string[] = [];

  if (spec.knowledgeDocs.length > 0) {
    const docs = spec.knowledgeDocs.slice(0, 3).map((d) => d.split(" (")[0]).join(" · ");
    lines.push(`📚 **Envie pra Conhecimento:** ${docs}`);
  }

  if (spec.tables.length > 0) {
    const tableNames = spec.tables.map((t) => `\`${t.name}\``).join(", ");
    lines.push(`🗂️ **Tabelas sugeridas:** ${tableNames} — me peça "criar tabela ${spec.tables[0].name}" que eu faço`);
  }

  if (spec.cadences.length > 0) {
    const cadenceNames = spec.cadences.map((c) => c.name).join(" · ");
    lines.push(`⏰ **Cadências:** ${cadenceNames}`);
  }

  return lines.join("\n");
}
