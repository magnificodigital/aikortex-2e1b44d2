// ─── PLATFORM HIERARCHY ─────────────────────────────

export type PlatformRole = "platform_owner" | "platform_admin";

export type AgencyRole = "agency_owner" | "agency_admin" | "agency_manager" | "agency_member";

export type ClientRole = "client_owner" | "client_manager" | "client_viewer";

export type SystemRole = PlatformRole | AgencyRole | ClientRole;

// ─── MODULES ────────────────────────────────────────
// Aligned with Tier Feature modules for consistency

export type PlatformModule = "dashboard" | "reports" | "integrations" | "partners";

export type AikortexModule = "agents" | "flows" | "apps" | "templates" | "messages" | "broadcasts";

export type GestaoModule = "clients" | "contracts" | "sales" | "crm" | "meetings" | "financial" | "team" | "tasks";

export type SystemModule = PlatformModule | AikortexModule | GestaoModule;

// ─── PERMISSIONS ────────────────────────────────────

export type PermissionAction = "view" | "create" | "edit" | "delete" | "manage";

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  manage: boolean;
}

export type RolePermissionMap = Record<SystemModule, ModulePermission>;

// ─── FEATURE FLAGS ──────────────────────────────────

export type FeatureFlag =
  | "feature.ai_agents"
  | "feature.voice_agents"
  | "feature.saas_builder"
  | "feature.marketplace_access"
  | "feature.event_speaker"
  | "feature.advanced_automation"
  | "feature.custom_reports"
  | "feature.white_label"
  | "feature.api_access"
  | "feature.media_participation"
  // Aikortex modules
  | "module.agents"
  | "module.flows"
  | "module.apps"
  | "module.templates"
  | "module.messages"
  | "module.broadcasts"
  // Gestão modules
  | "module.clients"
  | "module.contracts"
  | "module.sales"
  | "module.crm"
  | "module.meetings"
  | "module.financial"
  | "module.team"
  | "module.tasks";

export type PartnerTier = "starter" | "explorer" | "hack";

export interface TierFeatureConfig {
  label: string;
  color: string;
  bg: string;
  icon: string;
  features: FeatureFlag[];
}

// ─── AUDIT LOG ──────────────────────────────────────

export type AuditAction =
  | "role_assigned"
  | "role_removed"
  | "permission_changed"
  | "user_invited"
  | "user_suspended"
  | "user_activated"
  | "feature_enabled"
  | "feature_disabled"
  | "financial_change"
  | "module_access_changed";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  target: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

// ─── TENANT ─────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  type: "platform" | "agency" | "client";
  parentId?: string;
  tier?: PartnerTier;
  createdAt: string;
}

// ─── USER ───────────────────────────────────────────

export interface PlatformUser {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: SystemRole;
  tenantId: string;
  status: "active" | "invited" | "suspended";
  permissions: Partial<RolePermissionMap>;
  featureFlags: FeatureFlag[];
  lastActive?: string;
  createdAt: string;
}

// ─── CONFIGS ────────────────────────────────────────

export const ALL_MODULES: { key: SystemModule; label: string; group: "platform" | "aikortex" | "gestao" }[] = [
  // Plataforma
  { key: "dashboard", label: "Dashboard", group: "platform" },
  { key: "reports", label: "Relatórios", group: "platform" },
  { key: "integrations", label: "Integrações", group: "platform" },
  { key: "partners", label: "Parceiros", group: "platform" },
  // Aikortex
  { key: "agents", label: "Agentes", group: "aikortex" },
  { key: "flows", label: "Flows", group: "aikortex" },
  { key: "apps", label: "Apps", group: "aikortex" },
  { key: "templates", label: "Templates", group: "aikortex" },
  { key: "messages", label: "Mensagens", group: "aikortex" },
  { key: "broadcasts", label: "Disparos", group: "aikortex" },
  // Gestão
  { key: "clients", label: "Clientes", group: "gestao" },
  { key: "contracts", label: "Contratos", group: "gestao" },
  { key: "sales", label: "Vendas", group: "gestao" },
  { key: "crm", label: "CRM", group: "gestao" },
  { key: "meetings", label: "Reuniões", group: "gestao" },
  { key: "financial", label: "Financeiro", group: "gestao" },
  { key: "team", label: "Equipe", group: "gestao" },
  { key: "tasks", label: "Tarefas", group: "gestao" },
];

export const MODULE_GROUPS: { key: "platform" | "aikortex" | "gestao"; label: string }[] = [
  { key: "platform", label: "Plataforma" },
  { key: "aikortex", label: "Aikortex" },
  { key: "gestao", label: "Gestão" },
];

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: "view", label: "Visualizar" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
  { key: "manage", label: "Gerenciar" },
];

export const ROLE_CONFIG: Record<SystemRole, { label: string; level: "platform" | "agency" | "client"; color: string; bg: string; description: string }> = {
  platform_owner: { label: "Dono da Plataforma", level: "platform", color: "text-red-600", bg: "bg-red-500/10", description: "Acesso total ao Aikortex" },
  platform_admin: { label: "Admin da Plataforma", level: "platform", color: "text-red-500", bg: "bg-red-500/10", description: "Equipe interna do Aikortex" },
  agency_owner: { label: "Dono da Agência", level: "agency", color: "text-amber-600", bg: "bg-amber-500/10", description: "Dono do workspace" },
  agency_admin: { label: "Administrador da Agência", level: "agency", color: "text-purple-600", bg: "bg-purple-500/10", description: "Gestão ampla do workspace" },
  agency_manager: { label: "Gerente", level: "agency", color: "text-blue-600", bg: "bg-blue-500/10", description: "Gerencia projetos e clientes" },
  agency_member: { label: "Membro", level: "agency", color: "text-emerald-600", bg: "bg-emerald-500/10", description: "Acesso básico" },
  client_owner: { label: "Responsável do Cliente", level: "client", color: "text-slate-700", bg: "bg-slate-500/10", description: "Contato principal do cliente" },
  client_manager: { label: "Gerente do Cliente", level: "client", color: "text-slate-600", bg: "bg-slate-500/10", description: "Gerente do cliente com acesso parcial" },
  client_viewer: { label: "Visualizador", level: "client", color: "text-slate-500", bg: "bg-slate-500/10", description: "Apenas visualiza" },
};

export const TIER_FEATURE_CONFIG: Record<PartnerTier, TierFeatureConfig> = {
  starter: {
    label: "Starter",
    color: "text-amber-700",
    bg: "bg-amber-500/10",
    icon: "🥉",
    features: [
      "module.agents",
      "module.templates",
      "module.messages",
      "module.clients",
      "module.sales",
      "module.team",
      "module.tasks",
    ],
  },
  explorer: {
    label: "Explorer",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    icon: "🥈",
    features: [
      "module.agents",
      "module.flows",
      "module.apps",
      "module.templates",
      "module.messages",
      "module.broadcasts",
      "module.clients",
      "module.contracts",
      "module.sales",
      "module.crm",
      "module.financial",
      "module.team",
      "module.tasks",
      "feature.marketplace_access",
      "feature.custom_reports",
    ],
  },
  hack: {
    label: "Hack",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    icon: "🥇",
    features: [
      "module.agents",
      "module.flows",
      "module.apps",
      "module.templates",
      "module.messages",
      "module.broadcasts",
      "module.clients",
      "module.contracts",
      "module.sales",
      "module.crm",
      "module.meetings",
      "module.financial",
      "module.team",
      "module.tasks",
      "feature.marketplace_access",
      "feature.custom_reports",
      "feature.ai_agents",
      "feature.voice_agents",
      "feature.saas_builder",
      "feature.advanced_automation",
      "feature.api_access",
      "feature.event_speaker",
      "feature.white_label",
      "feature.media_participation",
    ],
  },
};

export const FEATURE_FLAG_LABELS: Record<FeatureFlag, string> = {
  "feature.ai_agents": "Agentes de IA",
  "feature.voice_agents": "Agentes de Voz",
  "feature.saas_builder": "Criação de SaaS",
  "feature.marketplace_access": "Marketplace",
  "feature.event_speaker": "Speaker em Eventos",
  "feature.advanced_automation": "Automação Avançada",
  "feature.custom_reports": "Relatórios Customizados",
  "feature.white_label": "White Label",
  "feature.api_access": "Acesso via API",
  "feature.media_participation": "Participação em Mídia",
  "module.agents": "Agentes",
  "module.flows": "Flows",
  "module.apps": "Apps",
  "module.templates": "Templates",
  "module.messages": "Mensagens",
  "module.broadcasts": "Disparos",
  "module.clients": "Clientes",
  "module.contracts": "Contratos",
  "module.sales": "Vendas",
  "module.crm": "CRM",
  "module.meetings": "Reuniões",
  "module.financial": "Financeiro",
  "module.team": "Equipe",
  "module.tasks": "Tarefas",
};

// ─── DEFAULT PERMISSIONS PER ROLE ───────────────────

const fullAccess: ModulePermission = { view: true, create: true, edit: true, delete: true, manage: true };
const readOnly: ModulePermission = { view: true, create: false, edit: false, delete: false, manage: false };
const noAccess: ModulePermission = { view: false, create: false, edit: false, delete: false, manage: false };
const editAccess: ModulePermission = { view: true, create: true, edit: true, delete: false, manage: false };

const allModulesFull = (): RolePermissionMap =>
  Object.fromEntries(ALL_MODULES.map(m => [m.key, { ...fullAccess }])) as RolePermissionMap;

const allModulesNone = (): RolePermissionMap =>
  Object.fromEntries(ALL_MODULES.map(m => [m.key, { ...noAccess }])) as RolePermissionMap;

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, RolePermissionMap> = {
  platform_owner: allModulesFull(),
  platform_admin: allModulesFull(),
  agency_owner: allModulesFull(),
  agency_admin: {
    ...allModulesFull(),
    partners: { ...readOnly },
  },
  agency_manager: {
    ...allModulesNone(),
    dashboard: { ...readOnly },
    clients: { ...editAccess },
    contracts: { ...readOnly },
    tasks: { ...fullAccess },
    team: { ...readOnly },
    reports: { ...readOnly },
    financial: { ...readOnly },
    agents: { ...readOnly },
    templates: { ...readOnly },
    messages: { ...readOnly },
    sales: { ...readOnly },
    crm: { ...readOnly },
    meetings: { ...readOnly },
  },
  agency_member: {
    ...allModulesNone(),
    dashboard: { ...readOnly },
    tasks: { ...editAccess },
    clients: { ...readOnly },
    agents: { ...readOnly },
    templates: { ...readOnly },
    messages: { ...readOnly },
  },
  client_owner: {
    ...allModulesNone(),
    dashboard: { ...readOnly },
    tasks: { ...readOnly },
    contracts: { ...readOnly },
    reports: { ...readOnly },
  },
  client_manager: {
    ...allModulesNone(),
    dashboard: { ...readOnly },
    tasks: { ...readOnly },
    contracts: { ...readOnly },
  },
  client_viewer: {
    ...allModulesNone(),
    dashboard: { ...readOnly },
  },
};

// ─── MOCK DATA ──────────────────────────────────────

export const mockAuditLog: AuditLogEntry[] = [
  { id: "au-1", userId: "tm-1", userName: "Rafael Costa", action: "role_assigned", target: "Ana Oliveira", details: "Atribuiu role agency_admin", timestamp: "2025-03-09T10:30:00" },
  { id: "au-2", userId: "tm-2", userName: "Ana Oliveira", action: "permission_changed", target: "Lucas Mendes", details: "Alterou permissões de Financeiro para somente leitura", timestamp: "2025-03-09T09:15:00" },
  { id: "au-3", userId: "tm-1", userName: "Rafael Costa", action: "user_invited", target: "beatriz@agency.com", details: "Convidou como agency_member", timestamp: "2025-03-08T17:00:00" },
  { id: "au-4", userId: "tm-1", userName: "Rafael Costa", action: "feature_enabled", target: "feature.ai_agents", details: "Ativou Agentes de IA para tier Hack", timestamp: "2025-03-08T14:00:00" },
  { id: "au-5", userId: "tm-2", userName: "Ana Oliveira", action: "user_suspended", target: "Diego Nascimento", details: "Conta suspensa por inatividade", timestamp: "2025-02-15T14:00:00" },
  { id: "au-6", userId: "tm-1", userName: "Rafael Costa", action: "financial_change", target: "Invoice #2847", details: "Aprovou pagamento de R$ 15.000", timestamp: "2025-03-07T11:00:00" },
];
