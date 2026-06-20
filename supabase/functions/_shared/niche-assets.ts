// Assets padrão por nicho — usado pelo Modo Vibe pra criar agente COMPLETO,
// não só identidade. Cobre tabelas, cadências, KB e guardrails contextuais.
//
// Fluxo:
//   1. Vibe DESCOBERTA detecta nicho
//   2. Na fase CRIAÇÃO, Vibe chama tools que CRIAM esses assets de verdade
//   3. Result: agente nasce com estrutura mínima pra rodar
//
// Catálogo inicial: Contabilidade, Saúde, Advocacia, Imobiliária.
// Outros nichos caem no genérico (sem tabelas/cadências auto, só guardrails).

export interface TableColumn {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "json";
  required?: boolean;
}

export interface NicheTable {
  slug: string;
  label: string;
  description: string;
  columns: TableColumn[];
}

export interface NicheCadenceStep {
  /** Dia relativo ao início (negativo = antes do evento, 0 = no dia, positivo = depois) */
  day: number;
  label: string;
  messageTemplate: string;
}

export interface NicheCadence {
  slug: string;
  name: string;
  description: string;
  trigger: "manual" | "novo_lead" | "agendamento" | "vencimento_prazo";
  steps: NicheCadenceStep[];
}

export interface NicheKbTopic {
  slug: string;
  title: string;
  description: string;
}

export interface NicheAssetSpec {
  niche: string;
  tables: NicheTable[];
  cadences: NicheCadence[];
  kbTopics: NicheKbTopic[];
  /** Guardrails específicos do nicho (somam aos universais). Cada item é
   * frase que vira regra NEGATIVA no prompt do agente. */
  contextualGuardrails: string[];
}

export const NICHE_ASSETS: Record<string, NicheAssetSpec> = {
  // ── Contabilidade ──────────────────────────────────────────────────────
  "Contabilidade": {
    niche: "Contabilidade",
    tables: [
      {
        slug: "clientes_contabeis",
        label: "Clientes contábeis",
        description: "Empresas/pessoas atendidas pelo escritório",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "cnpj_cpf", type: "text" },
          { name: "regime_tributario", type: "text" },
          { name: "email", type: "text" },
          { name: "telefone", type: "text" },
          { name: "responsavel", type: "text" },
        ],
      },
      {
        slug: "prazos_impostos",
        label: "Prazos de impostos",
        description: "Calendário fiscal dos clientes (DAS, DARF, ECF, etc)",
        columns: [
          { name: "tipo_imposto", type: "text", required: true },
          { name: "data_vencimento", type: "date", required: true },
          { name: "cliente", type: "text" },
          { name: "status", type: "text" },
        ],
      },
      {
        slug: "documentos_solicitados",
        label: "Documentos solicitados",
        description: "Checklist de documentos pendentes por cliente",
        columns: [
          { name: "cliente", type: "text", required: true },
          { name: "documento", type: "text", required: true },
          { name: "solicitado_em", type: "date" },
          { name: "recebido", type: "boolean" },
        ],
      },
    ],
    cadences: [
      {
        slug: "onboarding_cliente_contabil",
        name: "Onboarding de novo cliente",
        description: "Acolhe novo cliente, pede documentos iniciais",
        trigger: "novo_lead",
        steps: [
          { day: 0, label: "Boas-vindas", messageTemplate: "Olá! Bem-vindo ao escritório. Vou te enviar a lista de documentos pra começar." },
          { day: 1, label: "Lembrete docs", messageTemplate: "Oi, tudo bem? Já conseguiu separar os documentos? Posso ajudar com alguma dúvida." },
          { day: 7, label: "Follow-up final", messageTemplate: "Ainda estamos aguardando os documentos. Tem algo que está dificultando?" },
        ],
      },
      {
        slug: "lembrete_prazo_imposto",
        name: "Lembrete de prazo de imposto",
        description: "Avisa o cliente antes do vencimento de imposto",
        trigger: "vencimento_prazo",
        steps: [
          { day: -7, label: "Aviso 7 dias", messageTemplate: "Lembrete: vencimento do {tipo_imposto} em 7 dias. Tudo certo aí?" },
          { day: -1, label: "Aviso véspera", messageTemplate: "Atenção: {tipo_imposto} vence amanhã. Já conseguiu emitir?" },
        ],
      },
    ],
    kbTopics: [
      { slug: "regimes_tributarios", title: "Regimes tributários", description: "Simples, Lucro Presumido, Lucro Real — quando cada um cabe" },
      { slug: "documentos_abertura", title: "Documentos para abertura de empresa", description: "Lista de documentos necessários por tipo de empresa" },
      { slug: "calendario_fiscal", title: "Calendário fiscal anual", description: "Datas de DAS, DARF, ECF, DCTF, etc" },
      { slug: "faq_contabil", title: "FAQ — perguntas frequentes", description: "10 perguntas que mais aparecem no WhatsApp" },
      { slug: "tabela_honorarios", title: "Tabela de honorários", description: "Valor por tipo de serviço (revisão, abertura, mensal, etc)" },
    ],
    contextualGuardrails: [
      "Dar parecer fiscal definitivo sem revisão do contador",
      "Fazer cálculo tributário sem contexto completo do cliente",
      "Opinar sobre planejamento sucessório ou societário",
      "Recomendar regime tributário sem análise detalhada",
    ],
  },

  // ── Saúde / Clínica médica ─────────────────────────────────────────────
  "Saúde": {
    niche: "Saúde",
    tables: [
      {
        slug: "pacientes",
        label: "Pacientes",
        description: "Cadastro de pacientes da clínica",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "cpf", type: "text" },
          { name: "telefone", type: "text" },
          { name: "email", type: "text" },
          { name: "plano_saude", type: "text" },
          { name: "data_nascimento", type: "date" },
        ],
      },
      {
        slug: "agendamentos",
        label: "Agendamentos",
        description: "Consultas marcadas e disponibilidade",
        columns: [
          { name: "paciente", type: "text", required: true },
          { name: "data_hora", type: "date", required: true },
          { name: "tipo_consulta", type: "text" },
          { name: "profissional", type: "text" },
          { name: "status", type: "text" },
        ],
      },
      {
        slug: "planos_aceitos",
        label: "Planos de saúde aceitos",
        description: "Convênios e condições",
        columns: [
          { name: "nome_plano", type: "text", required: true },
          { name: "tipos_consulta_cobertos", type: "text" },
          { name: "exige_autorizacao", type: "boolean" },
        ],
      },
    ],
    cadences: [
      {
        slug: "confirmacao_consulta",
        name: "Confirmação de consulta",
        description: "Confirma presença antes do horário",
        trigger: "agendamento",
        steps: [
          { day: -2, label: "Confirmação 48h", messageTemplate: "Olá! Lembrando da sua consulta dia {data} às {hora}. Está confirmado?" },
          { day: -1, label: "Confirmação 24h", messageTemplate: "Oi, sua consulta é amanhã às {hora}. Responde SIM pra confirmar ou REMARCAR." },
        ],
      },
      {
        slug: "pos_consulta",
        name: "Pós-consulta",
        description: "Acompanha o paciente depois do atendimento",
        trigger: "agendamento",
        steps: [
          { day: 1, label: "Como foi?", messageTemplate: "Como você está se sentindo após a consulta? Alguma dúvida sobre a orientação?" },
          { day: 7, label: "Acompanhamento semanal", messageTemplate: "Passou uma semana — como tem sido a recuperação?" },
        ],
      },
    ],
    kbTopics: [
      { slug: "especialidades", title: "Especialidades atendidas", description: "Lista das especialidades médicas da clínica" },
      { slug: "planos_aceitos", title: "Planos de saúde aceitos", description: "Convênios cobertos + condições" },
      { slug: "politica_cancelamento", title: "Política de cancelamento", description: "Prazo pra cancelar/remarcar sem custo" },
      { slug: "preparos_exames", title: "Preparos para exames", description: "Jejum, suspensão de medicamentos, etc" },
      { slug: "faq_saude", title: "FAQ — perguntas frequentes", description: "Dúvidas mais comuns dos pacientes" },
      { slug: "horarios_atendimento", title: "Horários de atendimento", description: "Dias e horários por especialidade" },
    ],
    contextualGuardrails: [
      "Diagnosticar sintomas ou sugerir diagnóstico",
      "Prescrever medicamento ou indicar dosagem",
      "Orientar caso de emergência sem direcionar pra serviço médico",
      "Falar de prognóstico ou expectativa de recuperação",
      "Opinar sobre cirurgia ou procedimento invasivo",
    ],
  },

  // ── Advocacia ──────────────────────────────────────────────────────────
  "Advocacia": {
    niche: "Advocacia",
    tables: [
      {
        slug: "clientes_juridicos",
        label: "Clientes jurídicos",
        description: "Pessoas/empresas representadas pelo escritório",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "cpf_cnpj", type: "text" },
          { name: "tipo", type: "text" },
          { name: "telefone", type: "text" },
          { name: "email", type: "text" },
        ],
      },
      {
        slug: "processos_ativos",
        label: "Processos ativos",
        description: "Casos em andamento",
        columns: [
          { name: "numero_processo", type: "text", required: true },
          { name: "cliente", type: "text", required: true },
          { name: "area", type: "text" },
          { name: "fase", type: "text" },
          { name: "proxima_audiencia", type: "date" },
        ],
      },
      {
        slug: "prazos_juridicos",
        label: "Prazos jurídicos",
        description: "Vencimentos de prazos processuais",
        columns: [
          { name: "processo", type: "text", required: true },
          { name: "tipo_prazo", type: "text", required: true },
          { name: "data_vencimento", type: "date", required: true },
          { name: "responsavel", type: "text" },
        ],
      },
    ],
    cadences: [
      {
        slug: "lembrete_prazo_juridico",
        name: "Lembrete de prazo processual",
        description: "Alerta antes do vencimento de prazo",
        trigger: "vencimento_prazo",
        steps: [
          { day: -7, label: "Aviso 7 dias", messageTemplate: "Atenção: prazo do {tipo_prazo} em 7 dias. Já está em andamento?" },
          { day: -3, label: "Aviso 3 dias", messageTemplate: "Prazo vencendo em 3 dias. Confirma se está tudo encaminhado?" },
        ],
      },
      {
        slug: "update_processo_semanal",
        name: "Update semanal de processo",
        description: "Mantém cliente informado",
        trigger: "manual",
        steps: [
          { day: 0, label: "Update", messageTemplate: "Olá! Atualização semanal do seu processo: {status_atual}." },
        ],
      },
    ],
    kbTopics: [
      { slug: "areas_atuacao", title: "Áreas de atuação", description: "Trabalhista, cível, tributário, etc" },
      { slug: "tabela_honorarios", title: "Tabela de honorários", description: "Por área e tipo de causa" },
      { slug: "documentos_procuracao", title: "Documentos pra procuração", description: "Lista do que o cliente precisa trazer" },
      { slug: "politica_lgpd", title: "Política LGPD", description: "Como dados de cliente são tratados" },
      { slug: "faq_juridico", title: "FAQ — perguntas frequentes", description: "Dúvidas comuns no atendimento" },
    ],
    contextualGuardrails: [
      "Dar parecer jurídico definitivo sobre caso específico",
      "Opinar sobre chance de ganho ou perda de processo",
      "Falar valor exato de indenização ou condenação",
      "Sugerir estratégia processual sem revisão do advogado",
      "Confirmar prazo prescricional sem análise do caso",
    ],
  },

  // ── Imobiliária ────────────────────────────────────────────────────────
  "Imobiliária": {
    niche: "Imobiliária",
    tables: [
      {
        slug: "imoveis_disponiveis",
        label: "Imóveis disponíveis",
        description: "Portfólio em venda ou aluguel",
        columns: [
          { name: "codigo", type: "text", required: true },
          { name: "tipo", type: "text" },
          { name: "endereco", type: "text" },
          { name: "valor", type: "number" },
          { name: "quartos", type: "number" },
          { name: "area_m2", type: "number" },
          { name: "operacao", type: "text" },
        ],
      },
      {
        slug: "leads",
        label: "Leads imobiliários",
        description: "Interessados em imóveis",
        columns: [
          { name: "nome", type: "text", required: true },
          { name: "telefone", type: "text" },
          { name: "email", type: "text" },
          { name: "perfil_imovel", type: "text" },
          { name: "orcamento_max", type: "number" },
          { name: "origem", type: "text" },
        ],
      },
      {
        slug: "visitas_agendadas",
        label: "Visitas agendadas",
        description: "Agenda de visitas a imóveis",
        columns: [
          { name: "lead", type: "text", required: true },
          { name: "imovel", type: "text", required: true },
          { name: "data_hora", type: "date", required: true },
          { name: "corretor", type: "text" },
        ],
      },
    ],
    cadences: [
      {
        slug: "nutricao_lead_imobiliario",
        name: "Nutrição de lead",
        description: "Sequência pra lead frio até agendar visita",
        trigger: "novo_lead",
        steps: [
          { day: 1, label: "Primeira oferta", messageTemplate: "Olá! Achei 3 imóveis que batem com seu perfil. Quer dar uma olhada?" },
          { day: 3, label: "Reforço", messageTemplate: "Conseguiu ver os imóveis? Posso agendar uma visita pra você." },
          { day: 7, label: "Última tentativa", messageTemplate: "Ainda procurando imóvel? Tenho novidades essa semana." },
        ],
      },
      {
        slug: "pos_visita",
        name: "Pós-visita",
        description: "Follow-up depois da visita",
        trigger: "agendamento",
        steps: [
          { day: 1, label: "Feedback visita", messageTemplate: "O que achou do imóvel ontem? Quer ver outras opções similares?" },
        ],
      },
    ],
    kbTopics: [
      { slug: "regioes_atendidas", title: "Regiões atendidas", description: "Bairros e cidades onde temos imóveis" },
      { slug: "documentos_compra", title: "Documentos pra compra", description: "Lista do que comprador precisa apresentar" },
      { slug: "documentos_aluguel", title: "Documentos pra aluguel", description: "Lista de fiador, comprovante, etc" },
      { slug: "financiamento", title: "Linhas de financiamento", description: "Caixa, Itaú, BB — condições típicas" },
      { slug: "faq_imobiliario", title: "FAQ — perguntas frequentes", description: "Dúvidas mais comuns de compradores e locatários" },
    ],
    contextualGuardrails: [
      "Prometer aprovação de financiamento ou crédito",
      "Negociar valor sem aval do corretor responsável",
      "Falar de comissão da agência pro cliente",
      "Confirmar disponibilidade sem checar sistema",
      "Indicar imóvel fora do perfil/orçamento do lead",
    ],
  },
};

/** Formata bloco textual com assets do nicho pra injetar no prompt do Vibe.
 * Vai pra fase CRIAÇÃO — indica TUDO que o Vibe deve criar de uma vez. */
export function buildNicheAssetsBlock(niche: string | undefined): string {
  if (!niche) return "";
  const spec = NICHE_ASSETS[niche];
  if (!spec) return "";

  const tables = spec.tables.map((t) => `- \`${t.slug}\` — ${t.label} (${t.columns.length} colunas)`).join("\n");
  const cadences = spec.cadences.map((c) => `- \`${c.slug}\` — ${c.name} (${c.steps.length} mensagens)`).join("\n");
  const kbs = spec.kbTopics.map((k) => `- ${k.title}`).join("\n");
  const guardrails = spec.contextualGuardrails.map((g) => `- ${g}`).join("\n");

  return `

# 🏗️ ASSETS DETERMINÍSTICOS DO NICHO "${niche}" (Master v7.4 §13.5)

Na fase CRIAÇÃO, depois das tools básicas (set_niche, set_agent_name, etc), você DEVE criar TODOS esses assets pra entregar um agente COMPLETO:

## 📊 Tabelas (chame \`create_niche_table\` pra cada)
${tables}

## ⏱️ Cadências (chame \`create_niche_cadence\` pra cada)
${cadences}

## 📚 Tópicos de Conhecimento (chame \`seed_kb_topic\` pra cada)
${kbs}

## 🚧 Guardrails contextuais (chame \`add_guardrail\` pra cada — somam aos universais)
${guardrails}

⚠️ IMPORTANTE: Em modo personalizado/rascunho SEM cliente atribuído, tabelas NÃO podem ser criadas no banco (pertencem a cliente). Nesse caso, registre a INTENÇÃO via \`mark_pending_table\` pra criar quando o cliente for atribuído.`;
}
