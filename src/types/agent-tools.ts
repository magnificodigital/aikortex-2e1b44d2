import { Globe, Image as ImageIcon, type LucideIcon } from "lucide-react";

export type ToolKey = "web_search" | "image_gen";

export type Tier = "starter" | "explorer" | "hack";

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
    quotas: { starter: 50, explorer: 200, hack: 1000 },
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
    quotas: { starter: 50, explorer: 100, hack: 500 },
  },
};

export const AGENT_TOOLS_LIST: ToolCatalogEntry[] = Object.values(AGENT_TOOLS_CATALOG);
