/**
 * Infere o "onde o user esta" a partir do pathname — vira contexto no
 * system prompt do Stark ("usuario esta em detalhes do cliente").
 */
export interface StarkPageContext {
  path: string;
  route?: string;
  entity?: {
    type: string;
    id?: string;
    name?: string;
  };
}

const ROUTE_LABELS: {
  pattern: RegExp;
  label: string;
  entity?: (m: RegExpMatchArray) => StarkPageContext["entity"];
}[] = [
  { pattern: /^\/clients\/([^/]+)$/, label: "detalhes do cliente", entity: (m) => ({ type: "client", id: m[1] }) },
  { pattern: /^\/clients$/,          label: "lista de clientes" },
  { pattern: /^\/aikortex\/crm$/,    label: "CRM (Kanban de leads)" },
  { pattern: /^\/aikortex$/,         label: "CRM (Kanban de leads)" },
  { pattern: /^\/sales$/,            label: "vendas" },
  { pattern: /^\/tasks$/,            label: "tarefas" },
  { pattern: /^\/team$/,             label: "equipe" },
  { pattern: /^\/financial$/,        label: "financeiro (BRL)" },
  { pattern: /^\/financeiro$/,       label: "financeiro (BRL)" },
  { pattern: /^\/reports$/,          label: "relatorios" },
  { pattern: /^\/projects$/,         label: "projetos" },
  { pattern: /^\/proposals$/,        label: "propostas comerciais" },
  { pattern: /^\/contracts$/,        label: "contratos" },
  { pattern: /^\/partners$/,         label: "parceiros" },
  { pattern: /^\/apps$/,             label: "apps (integracoes)" },
  { pattern: /^\/app-builder$/,      label: "construtor de app" },
  { pattern: /^\/templates$/,        label: "galeria de templates de agentes" },
  { pattern: /^\/dashboard$/,        label: "dashboard geral" },
  { pattern: /^\/home$/,             label: "home (hub central)" },
  { pattern: /^\/settings/,          label: "configuracoes" },
];

export function inferPageContext(pathname: string): StarkPageContext {
  for (const r of ROUTE_LABELS) {
    const m = pathname.match(r.pattern);
    if (m) {
      return { path: pathname, route: r.label, entity: r.entity ? r.entity(m) : undefined };
    }
  }
  return { path: pathname };
}
