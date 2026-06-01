import { BookOpen, Database, DatabaseZap, Globe, Image as ImageIcon, type LucideIcon } from "lucide-react";

export type ToolKey = "web_search" | "image_gen" | "knowledge_search" | "table_read" | "table_write";

// Alinhado ao Master v7.4 §3.2: Start (gratuito) → Hack (R$197) → Growth (R$397)
export type Tier = "start" | "hack" | "growth";

export interface ToolCatalogEntry {
  key: ToolKey;
  name: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  requiredSecret: string;
  secretHelpUrl: string;
  quotas: Record<Tier, number>;
}

export const AGENT_TOOLS_CATALOG: Record<ToolKey, ToolCatalogEntry> = {
  web_search: {
    key: "web_search",
    name: "Pesquisa na Web",
    shortLabel: "web_search",
    description:
      "Busca em tempo real via Brave Search. Use para fatos recentes, notícias, preços e dados que mudam frequentemente.",
    icon: Globe,
    requiredSecret: "BRAVE_SEARCH_API_KEY",
    secretHelpUrl: "https://api.search.brave.com/app/keys",
    quotas: { start: 50, hack: 200, growth: 1000 },
  },
  image_gen: {
    key: "image_gen",
    name: "Geração de Imagem",
    shortLabel: "image_gen",
    description:
      "Cria imagens a partir de prompts textuais via OpenRouter (Nano Banana). Ideal para mockups, ilustrações e thumbnails.",
    icon: ImageIcon,
    requiredSecret: "OPENROUTER_API_KEY",
    secretHelpUrl: "https://openrouter.ai/keys",
    quotas: { start: 50, hack: 100, growth: 500 },
  },
  knowledge_search: {
    key: "knowledge_search",
    name: "Base de Conhecimento",
    shortLabel: "knowledge_search",
    description:
      "Permite o agente buscar informações nas bases de conhecimento que você cadastrou (PDFs, FAQs, URLs, textos). O LLM consulta automaticamente quando precisa de fatos específicos.",
    icon: BookOpen,
    requiredSecret: "OPENAI_API_KEY",
    secretHelpUrl: "https://platform.openai.com/api-keys",
    quotas: { start: -1, hack: -1, growth: -1 },
  },
  table_read: {
    key: "table_read",
    name: "Consultar tabelas",
    shortLabel: "table_read",
    description:
      "Permite o agente buscar registros nas tabelas do cliente (pacientes, produtos, agendamentos, etc.) com filtros.",
    icon: Database,
    requiredSecret: "—",
    secretHelpUrl: "https://docs.lovable.dev/",
    quotas: { start: -1, hack: -1, growth: -1 },
  },
  table_write: {
    key: "table_write",
    name: "Escrever em tabelas",
    shortLabel: "table_write",
    description:
      "Permite o agente cadastrar, atualizar ou remover registros nas tabelas do cliente.",
    icon: DatabaseZap,
    requiredSecret: "—",
    secretHelpUrl: "https://docs.lovable.dev/",
    quotas: { start: -1, hack: -1, growth: -1 },
  },
};

export const AGENT_TOOLS_LIST: ToolCatalogEntry[] = Object.values(AGENT_TOOLS_CATALOG);
