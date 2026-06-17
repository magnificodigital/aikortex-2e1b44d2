import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, User, TrendingUp, BookOpen, Award, LayoutTemplate, Calendar, MessageCircle, Loader2 } from "lucide-react";
import { type PartnerProfile } from "@/types/partner";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerTier } from "@/hooks/use-partner-tier";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PartnerProfileTab from "@/components/partners/PartnerProfileTab";
import PartnerTiersTab from "@/components/partners/PartnerTiersTab";
import TrainingCenterTab from "@/components/partners/TrainingCenterTab";
import CertificationsTab from "@/components/partners/CertificationsTab";
import MarketplaceTab from "@/components/partners/MarketplaceTab";
import EventsMediaTab from "@/components/partners/EventsMediaTab";
import CommunityTab from "@/components/partners/CommunityTab";

// Campos que ainda não têm coluna em agency_profiles ou partner_tiers.
// Persistidos em localStorage temporariamente. TODO: migrar pra coluna no banco
// quando houver UX clara — hoje seriam dados perdidos entre browsers.
const EDITABLE_STORAGE_KEY = "aihub_partner_editable_fields";

type EditableFields = Pick<PartnerProfile, "description" | "specializations" | "certifications" | "website">;

const EMPTY_EDITABLE: EditableFields = {
  description: "",
  specializations: [],
  certifications: [],
  website: "",
};

const loadEditable = (): EditableFields => {
  try {
    const raw = localStorage.getItem(EDITABLE_STORAGE_KEY);
    if (!raw) return EMPTY_EDITABLE;
    const parsed = JSON.parse(raw);
    return {
      description: typeof parsed.description === "string" ? parsed.description : "",
      specializations: Array.isArray(parsed.specializations) ? parsed.specializations.filter((x: unknown): x is string => typeof x === "string") : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications.filter((x: unknown): x is string => typeof x === "string") : [],
      website: typeof parsed.website === "string" ? parsed.website : "",
    };
  } catch {
    return EMPTY_EDITABLE;
  }
};

const Partners = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const { user } = useAuth();
  const { tier, data: partnerTierData, isLoading: tierLoading } = usePartnerTier();
  const queryClient = useQueryClient();

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // Cleanup da chave antiga (continha mock data: "Minha Agência IA", tier "hack")
  useEffect(() => {
    localStorage.removeItem("aihub_partner_profile");
  }, []);

  // Carrega agency_profiles (nome, logo, data de cadastro) do banco
  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ["partners-agency-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_profiles")
        .select("id, agency_name, logo_url, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [editable, setEditable] = useState<EditableFields>(loadEditable);

  useEffect(() => {
    localStorage.setItem(EDITABLE_STORAGE_KEY, JSON.stringify(editable));
  }, [editable]);

  if (agencyLoading || tierLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Monta profile combinando dados reais (banco) + editáveis (localStorage)
  const profile: PartnerProfile = {
    id: agency?.id || user?.id || "",
    name: agency?.agency_name || "Sua agência",
    logo: agency?.logo_url || undefined,
    email: user?.email || "",
    tier: tier || "start",
    clientsServed: partnerTierData?.clients_served ?? 0,
    revenue: Number(partnerTierData?.revenue ?? 0),
    solutionsPublished: partnerTierData?.solutions_published ?? 0,
    joinedAt: agency?.created_at || partnerTierData?.tier_upgraded_at || new Date().toISOString(),
    ...editable,
  };

  const handleUpdate = async (next: PartnerProfile) => {
    // Salva editáveis em localStorage
    setEditable({
      description: next.description,
      specializations: next.specializations,
      certifications: next.certifications,
      website: next.website ?? "",
    });

    // Persiste nome/logo no banco se mudaram
    const agencyChanged = next.name !== profile.name || next.logo !== profile.logo;
    if (agencyChanged && user?.id) {
      const { error } = await supabase
        .from("agency_profiles")
        .update({
          agency_name: next.name,
          logo_url: next.logo || null,
        })
        .eq("user_id", user.id);
      if (error) {
        toast.error(`Erro ao salvar agência: ${error.message}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["partners-agency-profile"] });
    }
  };

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

          <TabsContent value="profile"><PartnerProfileTab profile={profile} onUpdate={handleUpdate} /></TabsContent>
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
