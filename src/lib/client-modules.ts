// FONTE ÚNICA dos módulos que um CLIENTE pode ter.
// Usada em 3 lugares pra tudo bater (mesmas chaves = mesma visão):
//   1. Aba "Funcionalidades" do cliente (o que a agência liga por cliente)
//   2. /workspace do cliente (o que ele vê logado)
//   3. Sidebar da agência no modo cliente (o que a agência vê "como cliente")
// A key é o que fica salvo em agency_clients.enabled_modules.

export interface ClientModule {
  key: string;
  label: string;
  group: "Aikortex" | "Gestão";
  /** Rota no app da agência (usada no modo cliente do switcher). */
  agencyPath: string;
  /** Rota dentro do /workspace do cliente logado. */
  workspacePath: string;
  /** Tem tela de verdade pro cliente hoje? (senão é placeholder "em construção"
   *  e não deve ser oferecido pro cliente ainda). */
  available: boolean;
}

export const CLIENT_MODULES: ClientModule[] = [
  { key: "stark.copilot",      group: "Aikortex", label: "Stark",      agencyPath: "/home",             workspacePath: "/workspace/stark",    available: false },
  { key: "aikortex.agentes",   group: "Aikortex", label: "Agentes",    agencyPath: "/aikortex/agents",  workspacePath: "/workspace/agents",   available: true },
  { key: "aikortex.mensagens", group: "Aikortex", label: "Mensagens",  agencyPath: "/aikortex/messages", workspacePath: "/workspace/messages", available: true },
  { key: "aikortex.crm",       group: "Aikortex", label: "CRM",        agencyPath: "/aikortex/crm",     workspacePath: "/workspace/crm",      available: true },
  { key: "aikortex.ligacoes",  group: "Aikortex", label: "Ligações",   agencyPath: "/calls",            workspacePath: "/workspace/calls",    available: true },
  { key: "aikortex.apps",      group: "Aikortex", label: "Apps",       agencyPath: "/apps",             workspacePath: "/workspace/apps",     available: true },
  { key: "gestao.financeiro",  group: "Gestão",   label: "Financeiro", agencyPath: "/financial",        workspacePath: "/workspace/financial", available: true },
  { key: "gestao.tarefas",     group: "Gestão",   label: "Tarefas",    agencyPath: "/tasks",            workspacePath: "/workspace/tasks",    available: true },
  { key: "gestao.equipe",      group: "Gestão",   label: "Equipe",     agencyPath: "/team",             workspacePath: "/workspace/team",     available: true },
];

// Só os módulos que têm tela de verdade — os que o cliente pode usar hoje.
export const AVAILABLE_CLIENT_MODULES = CLIENT_MODULES.filter((m) => m.available);
export const CLIENT_MODULE_KEYS = CLIENT_MODULES.map((m) => m.key);
