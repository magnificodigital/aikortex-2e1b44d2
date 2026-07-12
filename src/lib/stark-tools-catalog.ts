/**
 * Catalogo canonico das tools do Stark — UMA fonte pra Settings do user
 * e pro painel admin. Os ids batem com os metodos @ai_callable em
 * aikortex-stark-agent/src/tools/__init__.py — manter sincronizado.
 */
export interface StarkToolDef {
  id: string;
  label: string;
  group: string;
  description: string;
  /** Tool de escrita/acao — destaque visual de risco maior. */
  write?: boolean;
}

export const STARK_TOOL_CATALOG: StarkToolDef[] = [
  // Aikortex
  { id: "list_agents",        label: "Listar agentes",        group: "Aikortex", description: "Lista os agentes cadastrados" },
  { id: "query_messages",     label: "Mensagens",             group: "Aikortex", description: "Conta conversas no período" },
  { id: "query_calls",        label: "Ligações",              group: "Aikortex", description: "Conta ligações telefônicas" },
  { id: "query_cadences",     label: "Cadências",             group: "Aikortex", description: "Conta execuções de cadência" },
  { id: "count_outcomes",     label: "Qualificações/Outcomes", group: "Aikortex", description: "Conta outcomes (qualified, booked etc)" },

  // Gestão — leitura
  { id: "list_clients",       label: "Clientes",              group: "Gestão", description: "Lista clientes da agência" },
  { id: "count_new_clients",  label: "Novos clientes",        group: "Gestão", description: "Conta clientes novos no período" },
  { id: "get_client_details", label: "Detalhe de cliente",    group: "Gestão", description: "Contato, status, módulos e assinaturas de um cliente" },
  { id: "query_pipeline",     label: "Pipeline CRM",          group: "Gestão", description: "Funil de leads por etapa e temperatura" },
  { id: "list_hot_leads",     label: "Leads quentes",         group: "Gestão", description: "Quem priorizar hoje" },
  { id: "list_meetings",      label: "Reuniões",              group: "Gestão", description: "Lista reuniões agendadas/ocorridas" },
  { id: "executive_briefing", label: "Briefing executivo",    group: "Gestão", description: "Resumo geral do negócio numa resposta" },

  // Financeiro
  { id: "query_mrr",          label: "MRR (Receita)",         group: "Financeiro", description: "Soma a receita mensal recorrente" },
  { id: "query_invoices",     label: "Faturas",               group: "Financeiro", description: "Lista faturas pendentes/pagas" },
  { id: "query_invoices_due", label: "Vencimentos",           group: "Financeiro", description: "Faturas vencendo ou atrasadas" },

  // Ações de escrita
  { id: "create_client",        label: "Cadastrar cliente",   group: "Ações de gestão", description: "Cria cliente novo por voz (com confirmação)", write: true },
  { id: "update_client_status", label: "Ativar/desativar cliente", group: "Ações de gestão", description: "Muda status de um cliente", write: true },
  { id: "create_crm_lead",      label: "Adicionar lead",      group: "Ações de gestão", description: "Cria lead no pipeline CRM", write: true },
  { id: "move_lead_stage",      label: "Mover lead de etapa", group: "Ações de gestão", description: "Avança/recua lead no funil", write: true },
  { id: "create_meeting",       label: "Criar reunião",       group: "Ações de gestão", description: "Cria sala de reunião", write: true },
  { id: "cancel_meeting",       label: "Encerrar reunião",    group: "Ações de gestão", description: "Encerra/cancela reunião", write: true },

  // Navegação
  { id: "navigate_to",  label: "Navegar entre páginas", group: "Navegação", description: "\"Me leva pro financeiro\" abre a página" },
  { id: "open_client",  label: "Abrir perfil de cliente", group: "Navegação", description: "Abre a tela de um cliente específico" },

  // Criador de agentes (nasce bloqueado pela plataforma)
  { id: "open_agent_creator", label: "Criar agente por voz", group: "Criação", description: "Abre o wizard ao pedir um novo agente", write: true },
];

export const STARK_TOOL_GROUPS = Array.from(new Set(STARK_TOOL_CATALOG.map(t => t.group)));
