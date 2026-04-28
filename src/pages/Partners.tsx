import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, User, TrendingUp, BookOpen, Award, LayoutTemplate, Calendar, MessageCircle } from "lucide-react";
import { type PartnerProfile } from "@/types/partner";
import PartnerProfileTab from "@/components/partners/PartnerProfileTab";
import PartnerTiersTab from "@/components/partners/PartnerTiersTab";
import TrainingCenterTab from "@/components/partners/TrainingCenterTab";
import CertificationsTab from "@/components/partners/CertificationsTab";
import MarketplaceTab from "@/components/partners/MarketplaceTab";
import EventsMediaTab from "@/components/partners/EventsMediaTab";
import CommunityTab from "@/components/partners/CommunityTab";

const STORAGE_KEY = "aihub_partner_profile";

const DEFAULT_PROFILE: PartnerProfile = {
  id: "1",
  name: "Minha Agência IA",
  description: "Agência especializada em soluções de inteligência artificial para negócios.",
  specializations: ["Automação IA", "Agentes de IA", "CRM"],
  certifications: ["AI Automation Specialist", "CRM Implementation Expert"],
  tier: "explorer",
  clientsServed: 12,
  revenue: 35000,
  solutionsPublished: 3,
  joinedAt: "2024-01-15",
  email: "contato@minhaagencia.com",
  website: "https://minhaagencia.com",
};

const normalizePartnerProfile = (value: unknown): PartnerProfile => {
  const saved = value && typeof value === "object" ? (value as Partial<PartnerProfile>) : {};

  return {
    ...DEFAULT_PROFILE,
    ...saved,
    id: typeof saved.id === "string" && saved.id ? saved.id : DEFAULT_PROFILE.id,
    name: typeof saved.name === "string" && saved.name.trim() ? saved.name : DEFAULT_PROFILE.name,
    description: typeof saved.description === "string" ? saved.description : DEFAULT_PROFILE.description,
    specializations: Array.isArray(saved.specializations)
      ? saved.specializations.filter((item): item is string => typeof item === "string")
      : DEFAULT_PROFILE.specializations,
    certifications: Array.isArray(saved.certifications)
      ? saved.certifications.filter((item): item is string => typeof item === "string")
      : DEFAULT_PROFILE.certifications,
    tier: saved.tier === "starter" || saved.tier === "explorer" || saved.tier === "hack"
      ? saved.tier
      : DEFAULT_PROFILE.tier,
    clientsServed: typeof saved.clientsServed === "number" ? saved.clientsServed : DEFAULT_PROFILE.clientsServed,
    revenue: typeof saved.revenue === "number" ? saved.revenue : DEFAULT_PROFILE.revenue,
    solutionsPublished: typeof saved.solutionsPublished === "number" ? saved.solutionsPublished : DEFAULT_PROFILE.solutionsPublished,
    joinedAt: typeof saved.joinedAt === "string" && saved.joinedAt ? saved.joinedAt : DEFAULT_PROFILE.joinedAt,
    email: typeof saved.email === "string" && saved.email ? saved.email : DEFAULT_PROFILE.email,
    website: typeof saved.website === "string" ? saved.website : DEFAULT_PROFILE.website,
    logo: typeof saved.logo === "string" ? saved.logo : undefined,
  };
};

const Partners = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const [profile, setProfile] = useState<PartnerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizePartnerProfile(JSON.parse(saved)) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePartnerProfile(profile)));
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Partners</h1>
            <p className="text-sm text-muted-foreground">Evolua, certifique-se e monetize no ecossistema AIHUB</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs"><User className="w-3.5 h-3.5" />Perfil</TabsTrigger>
            <TabsTrigger value="tiers" className="flex items-center gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" />Evolução</TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-1.5 text-xs"><BookOpen className="w-3.5 h-3.5" />Treinamentos</TabsTrigger>
            <TabsTrigger value="certifications" className="flex items-center gap-1.5 text-xs"><Award className="w-3.5 h-3.5" />Certificações</TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-1.5 text-xs"><LayoutTemplate className="w-3.5 h-3.5" />Templates</TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5" />Eventos & Mídia</TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-1.5 text-xs"><MessageCircle className="w-3.5 h-3.5" />Comunidade</TabsTrigger>
          </TabsList>

          <TabsContent value="profile"><PartnerProfileTab profile={profile} onUpdate={setProfile} /></TabsContent>
          <TabsContent value="tiers"><PartnerTiersTab /></TabsContent>
          <TabsContent value="training"><TrainingCenterTab /></TabsContent>
          <TabsContent value="certifications"><CertificationsTab /></TabsContent>
          <TabsContent value="marketplace"><MarketplaceTab /></TabsContent>
          <TabsContent value="events"><EventsMediaTab /></TabsContent>
          <TabsContent value="community"><CommunityTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Partners;
