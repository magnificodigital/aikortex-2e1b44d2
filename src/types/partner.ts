export type PartnerTier = "starter" | "explorer" | "hack";

export interface PartnerProfile {
  id: string;
  name: string;
  logo?: string;
  description: string;
  specializations: string[];
  certifications: string[];
  tier: PartnerTier;
  clientsServed: number;
  revenue: number;
  solutionsPublished: number;
  joinedAt: string;
  website?: string;
  email: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  lessons: number;
  duration: string;
  certification?: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  thumbnail?: string;
}

export interface Certification {
  id: string;
  name: string;
  description: string;
  courseId: string;
  earnedAt?: string;
  expiresAt?: string;
  status: "locked" | "available" | "earned";
  icon: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  category: "agent" | "automation" | "crm_setup" | "template" | "saas";
  price: number;
  currency: string;
  author: string;
  rating: number;
  reviews: number;
  installs: number;
  screenshots: string[];
  tags: string[];
  status: "draft" | "published" | "under_review";
}

export interface PartnerEvent {
  id: string;
  title: string;
  date: string;
  type: "conference" | "webinar" | "workshop" | "podcast";
  status: "upcoming" | "open" | "closed";
  speakerSlots: boolean;
  registered: boolean;
}

export interface CommunityChannel {
  id: string;
  name: string;
  description: string;
  members: number;
  messages: number;
  lastActivity: string;
}

export const TIER_CONFIG: Record<PartnerTier, { label: string; color: string; minClients: number; minRevenue: number; minSolutions: number; minCerts: number; benefits: string[] }> = {
  starter: {
    label: "Starter",
    color: "text-amber-700",
    minClients: 0,
    minRevenue: 0,
    minSolutions: 0,
    minCerts: 0,
    benefits: ["Acesso à comunidade", "Treinamentos básicos", "Suporte padrão"],
  },
  explorer: {
    label: "Explorer",
    color: "text-gray-400",
    minClients: 5,
    minRevenue: 10000,
    minSolutions: 1,
    minCerts: 1,
    benefits: ["Marketplace básico", "Badge de parceiro", "Eventos exclusivos", "Suporte prioritário"],
  },
  hack: {
    label: "Hack",
    color: "text-yellow-500",
    minClients: 20,
    minRevenue: 50000,
    minSolutions: 5,
    minCerts: 3,
    benefits: ["Top marketplace", "Co-marketing", "Early access a features", "Comissões aumentadas", "White-label", "SLA dedicado"],
  },
};
