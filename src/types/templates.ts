export type TemplateCategory = 'agent' | 'automation' | 'app';

export type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  niche_id: string | null;
  agent_config?: Record<string, any> | null;
  app_config?: Record<string, any> | null;
  niche_categories: {
    slug: string;
    name_pt: string;
    icon: string;
  } | null;
};

export type NicheRow = {
  id: string;
  slug: string;
  name_pt: string;
  icon: string;
  description: string | null;
  display_order: number;
};
