import {
  Database, Search, BookOpen, Globe, Calendar, Mail, Send, Tag,
  Image as ImageIcon, CreditCard, Building2, FileSpreadsheet, HardDrive,
  type LucideIcon,
} from "lucide-react";
import type { TemplateRow } from "@/types/templates";

// Catálogo das ferramentas de runtime que o agente REALMENTE executa (cada uma
// mapeia a um edge function `tool-*` ou a uma integração conectada). Serve pra
// grade "Ferramentas que o agente vai usar" no preview do modelo (estilo Clint).
// ⚠️ Só listar o que existe de fato — não prometer ferramenta que o runtime não tem.

export type RuntimeToolMeta = {
  label: string;
  description: string;
  Icon: LucideIcon;
  tint: string; // classes tailwind para o quadradinho do ícone
};

// id da ferramenta (config.enabledTools) → metadados
export const RUNTIME_TOOLS: Record<string, RuntimeToolMeta> = {
  table_write:           { label: "Salvar em tabela",       description: "Registra dados (leads, respostas, campos) numa tabela do negócio.", Icon: Database,        tint: "bg-indigo-500/15 text-indigo-500" },
  table_read:            { label: "Consultar tabela",       description: "Busca dados já salvos por contato, id ou filtro.",                  Icon: Search,          tint: "bg-sky-500/15 text-sky-500" },
  knowledge_search:      { label: "Base de conhecimento",   description: "Responde a partir dos documentos e materiais que você subir.",      Icon: BookOpen,        tint: "bg-amber-500/15 text-amber-500" },
  web_search:            { label: "Busca na web",           description: "Pesquisa informações na internet para apoiar a resposta.",          Icon: Globe,           tint: "bg-fuchsia-500/15 text-fuchsia-500" },
  create_calendar_event: { label: "Criar agendamento",      description: "Agenda uma reunião com o contato no Google Calendar.",              Icon: Calendar,        tint: "bg-emerald-500/15 text-emerald-500" },
  send_email:            { label: "Enviar e-mail",          description: "Dispara um e-mail para o contato.",                                 Icon: Mail,            tint: "bg-rose-500/15 text-rose-500" },
  send_whatsapp:         { label: "Enviar WhatsApp",        description: "Envia mensagens de texto para o contato no WhatsApp.",              Icon: Send,            tint: "bg-teal-500/15 text-teal-500" },
  add_tag:               { label: "Adicionar tag",          description: "Marca o contato com uma tag, criando-a se não existir.",            Icon: Tag,             tint: "bg-violet-500/15 text-violet-500" },
  image_gen:             { label: "Gerar imagem",           description: "Cria imagens a partir de um pedido em texto.",                      Icon: ImageIcon,       tint: "bg-pink-500/15 text-pink-500" },
  asaas_create_payment:  { label: "Gerar cobrança",         description: "Cria uma cobrança (Pix/boleto/cartão) via Asaas.",                  Icon: CreditCard,      tint: "bg-green-600/15 text-green-600" },
};

// integração conectada (config.integrations) → metadados
export const INTEGRATION_TOOLS: Record<string, RuntimeToolMeta> = {
  google_calendar: { label: "Google Calendar", description: "Consulta horários e agenda reuniões na agenda da equipe.", Icon: Calendar,         tint: "bg-emerald-500/15 text-emerald-500" },
  google_sheets:   { label: "Google Sheets",   description: "Lê e escreve dados em planilhas.",                         Icon: FileSpreadsheet,  tint: "bg-green-500/15 text-green-500" },
  google_drive:    { label: "Google Drive",    description: "Acessa arquivos e documentos do Drive.",                   Icon: HardDrive,        tint: "bg-blue-500/15 text-blue-500" },
  gmail:           { label: "Gmail",           description: "Envia e lê e-mails pela conta conectada.",                 Icon: Mail,             tint: "bg-rose-500/15 text-rose-500" },
  hubspot:         { label: "HubSpot",         description: "Sincroniza contatos e negócios com o CRM.",                Icon: Building2,        tint: "bg-orange-500/15 text-orange-500" },
};

// Ferramentas padrão por tipo de agente — usado quando o template ainda não
// declara enabledTools, pra grade não vir vazia (só ferramentas REAIS).
const DEFAULT_TOOLS_BY_TYPE: Record<string, string[]> = {
  sdr:       ["table_write", "table_read", "create_calendar_event", "send_whatsapp", "web_search", "add_tag"],
  sac:       ["knowledge_search", "table_read", "send_whatsapp", "send_email", "add_tag"],
  marketing: ["image_gen", "web_search", "knowledge_search", "send_whatsapp"],
  custom:    ["knowledge_search", "table_read", "web_search"],
};

export type ResolvedTool = RuntimeToolMeta & { id: string; kind: "tool" | "integration" };

// Deriva a lista de ferramentas de um template para o preview.
export function resolveTemplateTools(template: TemplateRow | null): ResolvedTool[] {
  if (!template) return [];
  const cfg = (template.agent_config ?? {}) as Record<string, any>;
  const inner = (cfg.config ?? {}) as Record<string, any>;

  const enabled: string[] = Array.isArray(cfg.enabledTools)
    ? cfg.enabledTools
    : (Array.isArray(inner.enabledTools) ? inner.enabledTools : []);

  const integrationsRaw = cfg.integrations ?? inner.integrations ?? [];
  const integrationList: string[] = Array.isArray(integrationsRaw)
    ? integrationsRaw
    : (integrationsRaw && typeof integrationsRaw === "object"
        ? Object.keys(integrationsRaw).filter((k) => integrationsRaw[k])
        : []);

  let toolIds = enabled;
  if (toolIds.length === 0 && integrationList.length === 0) {
    const type = String(cfg.agent_type ?? "custom").toLowerCase();
    toolIds = DEFAULT_TOOLS_BY_TYPE[type] ?? DEFAULT_TOOLS_BY_TYPE.custom;
  }

  const out: ResolvedTool[] = [];
  for (const id of toolIds) {
    const meta = RUNTIME_TOOLS[id];
    if (meta) out.push({ ...meta, id, kind: "tool" });
  }
  for (const id of integrationList) {
    const meta = INTEGRATION_TOOLS[id];
    if (meta) out.push({ ...meta, id, kind: "integration" });
  }
  return out;
}
