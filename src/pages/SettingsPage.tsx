import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Settings,
  Palette,
  Image,
  Globe,
  Link2,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Copy,
  ExternalLink,
  Upload,
  RotateCcw,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Facebook,
  Mail,
  Phone,
  Star,
  ArrowUp,
  ArrowDown,
  Plug,
  CreditCard,
  Radio,
  DollarSign,
  Sparkles,
  Mic,
} from "lucide-react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";
import AgencyChannelsManager from "@/components/settings/AgencyChannelsManager";
import AgencyPermissions from "@/components/settings/AgencyPermissions";
import SubscriptionTab from "@/components/settings/SubscriptionTab";
import AsaasConfigTab from "@/components/settings/AsaasConfigTab";
import StarkSettingsTab from "@/components/settings/StarkSettingsTab";
import RevenueDashboard from "@/components/settings/RevenueDashboard";

// ─── TYPES ──────────────────────────────────────────
interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  success: string;
  warning: string;
}

interface BioLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  active: boolean;
}

interface LandingSection {
  id: string;
  type: "hero" | "services" | "about" | "testimonials" | "cta" | "contact";
  title: string;
  subtitle: string;
  content: string;
  visible: boolean;
}

// ─── DEFAULT DATA ──────────────────────────────────
const defaultColors: BrandColors = {
  primary: "#2563eb",
  secondary: "#64748b",
  accent: "#06b6d4",
  background: "#f5f6f8",
  foreground: "#1e2330",
  success: "#22c55e",
  warning: "#f59e0b",
};

const defaultBioLinks: BioLink[] = [
  { id: "1", label: "Instagram", url: "https://instagram.com/agencia", icon: "instagram", active: true },
  { id: "2", label: "LinkedIn", url: "https://linkedin.com/company/agencia", icon: "linkedin", active: true },
  { id: "3", label: "WhatsApp", url: "https://wa.me/5511999999999", icon: "phone", active: true },
  { id: "4", label: "Website", url: "https://agencia.com", icon: "globe", active: true },
  { id: "5", label: "Email", url: "mailto:contato@agencia.com", icon: "mail", active: true },
];

const defaultSections: LandingSection[] = [
  { id: "s1", type: "hero", title: "Transformamos negócios com IA", subtitle: "Agência de Automação & Inteligência Artificial", content: "Somos especialistas em criar soluções inteligentes que aceleram o crescimento da sua empresa.", visible: true },
  { id: "s2", type: "services", title: "Nossos Serviços", subtitle: "Soluções completas para sua empresa", content: "Automação com IA, Chatbots Inteligentes, CRM & Vendas, Marketing Digital, Consultoria Estratégica, Desenvolvimento Web", visible: true },
  { id: "s3", type: "about", title: "Sobre Nós", subtitle: "Quem somos", content: "Com mais de 5 anos de experiência, nossa equipe combina tecnologia de ponta com estratégia para entregar resultados reais.", visible: true },
  { id: "s4", type: "testimonials", title: "Depoimentos", subtitle: "O que nossos clientes dizem", content: "\"A automação com IA revolucionou nosso atendimento\" - Carlos, TechFlow Corp | \"Resultado incrível em apenas 3 meses\" - Ana, Nova Digital", visible: true },
  { id: "s5", type: "cta", title: "Pronto para transformar seu negócio?", subtitle: "Agende uma consultoria gratuita", content: "Entre em contato e descubra como podemos ajudar sua empresa a crescer com inteligência artificial.", visible: true },
  { id: "s6", type: "contact", title: "Contato", subtitle: "Fale conosco", content: "contato@agencia.com | +55 11 99999-9999 | São Paulo, SP", visible: true },
];

const iconMap: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  link: <Link2 className="w-4 h-4" />,
};

// ─── HELPERS ────────────────────────────────────────
const STORAGE_KEY = "aihub_brand";

const loadBrand = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const applyColorsToCSS = (c: BrandColors) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", hexToHsl(c.primary));
  root.style.setProperty("--accent", hexToHsl(c.accent));
  root.style.setProperty("--secondary", hexToHsl(c.secondary));
  root.style.setProperty("--success", hexToHsl(c.success));
  root.style.setProperty("--warning", hexToHsl(c.warning));
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

// ─── SETTINGS PAGE ─────────────────────────────────
const SettingsPage = () => {
  const saved = loadBrand();

  const [colors, setColors] = useState<BrandColors>(saved?.colors ?? defaultColors);
  const [logoUrl, setLogoUrl] = useState<string | null>(saved?.logoUrl ?? null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(saved?.faviconUrl ?? null);
  const [agencyName, setAgencyName] = useState(saved?.agencyName ?? "Minha Agência");
  const [agencySlogan, setAgencySlogan] = useState(saved?.agencySlogan ?? "Automação & IA para empresas");
  const [bioLinks, setBioLinks] = useState<BioLink[]>(saved?.bioLinks ?? defaultBioLinks);
  const [bioTitle, setBioTitle] = useState(saved?.bioTitle ?? "Minha Agência");
  const [bioDescription, setBioDescription] = useState(saved?.bioDescription ?? "Especialistas em automação e inteligência artificial");
  const [sections, setSections] = useState<LandingSection[]>(saved?.sections ?? defaultSections);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saved?.colors) applyColorsToCSS(saved.colors);
  }, []);

  // Color handlers
  const updateColor = (key: keyof BrandColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const resetColors = () => {
    setColors(defaultColors);
    toast({ title: "Cores restauradas ao padrão" });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setLogoUrl(base64);
    toast({ title: "Logo atualizado" });
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setFaviconUrl(base64);
    toast({ title: "Favicon atualizado" });
  };

  // Bio link handlers
  const addBioLink = () => {
    setBioLinks(prev => [...prev, { id: crypto.randomUUID(), label: "Novo Link", url: "https://", icon: "link", active: true }]);
  };

  const updateBioLink = (id: string, field: keyof BioLink, value: string | boolean) => {
    setBioLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeBioLink = (id: string) => {
    setBioLinks(prev => prev.filter(l => l.id !== id));
  };

  const moveBioLink = (id: string, dir: "up" | "down") => {
    setBioLinks(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if ((dir === "up" && idx === 0) || (dir === "down" && idx === prev.length - 1)) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // Section handlers
  const updateSection = (id: string, field: keyof LandingSection, value: string | boolean) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moveSection = (id: string, dir: "up" | "down") => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if ((dir === "up" && idx === 0) || (dir === "down" && idx === prev.length - 1)) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const addSection = () => {
    setSections(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "cta",
      title: "Nova Seção",
      subtitle: "Subtítulo",
      content: "Conteúdo da seção...",
      visible: true,
    }]);
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const copyBioUrl = () => {
    navigator.clipboard.writeText(`https://aihub.app/bio/${agencyName.toLowerCase().replace(/\s+/g, "-")}`);
    toast({ title: "Link copiado!" });
  };

  const { user } = useAuth();

  const saveBrand = async () => {
    const data = { colors, logoUrl, faviconUrl, agencyName, agencySlogan, bioLinks, bioTitle, bioDescription, sections };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyColorsToCSS(colors);

    // Sync agency name to database
    if (user) {
      await supabase
        .from("agency_profiles")
        .upsert({ user_id: user.id, agency_name: agencyName }, { onConflict: "user_id" });
    }

    toast({ title: "Brand salvo com sucesso", description: "Todas as configurações foram aplicadas." });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-sm text-muted-foreground">Brand, integrações e personalização do workspace</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "stark"} className="space-y-4">
          <TabsList className="flex h-auto w-full max-w-full gap-1 overflow-x-auto bg-muted/50 p-1 justify-start [scrollbar-width:none]">
            <TabsTrigger value="stark" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Mic className="h-3.5 w-3.5" /> Stark</TabsTrigger>
            <TabsTrigger value="providers" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Sparkles className="h-3.5 w-3.5" /> Provedores</TabsTrigger>
            <TabsTrigger value="integrations" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Plug className="h-3.5 w-3.5" /> Conectores</TabsTrigger>
            <TabsTrigger value="channels" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Radio className="h-3.5 w-3.5" /> Canais</TabsTrigger>
            
            <TabsTrigger value="subscription" className="shrink-0 gap-1 whitespace-nowrap text-xs"><CreditCard className="h-3.5 w-3.5" /> Assinatura & Planos</TabsTrigger>
            <TabsTrigger value="receita" className="shrink-0 gap-1 whitespace-nowrap text-xs"><DollarSign className="h-3.5 w-3.5" /> Receita</TabsTrigger>
            <TabsTrigger value="financeiro" className="shrink-0 gap-1 whitespace-nowrap text-xs"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
          </TabsList>

          {/* ── PROVEDORES (LLMs) ───────────────────── */}
          {/* ── STARK ─────────────────────────── */}
          <TabsContent value="stark" className="space-y-6">
            <StarkSettingsTab />
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <IntegrationsGrid
              providers={LLM_PROVIDERS}
              variant="card"
              title="Provedores de IA"
              subtitle="Conecte chaves de API dos modelos que seus agentes vão usar. Clique no card pra configurar modelo padrão, temperatura, máx tokens e top-p."
            />
          </TabsContent>

          {/* ── CONECTORES (serviços externos via Composio) ── */}
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsGrid
              providers={SERVICE_PROVIDERS}
              variant="card"
              title="Conectores"
              subtitle="Conecte contas externas (Google, CRMs, mensageria) que os agentes podem usar durante a conversa."
            />
          </TabsContent>

          {/* ── CANAIS ─────────────────────────── */}
          <TabsContent value="channels" className="space-y-6">
            <AgencyChannelsManager />
          </TabsContent>


          {/* ── ASSINATURA ─────────────────────────── */}
          <TabsContent value="subscription">
            <SubscriptionTab />
          </TabsContent>

          {/* ── RECEITA (dashboard de billing por agente publicado) ── */}
          <TabsContent value="receita">
            <RevenueDashboard />
          </TabsContent>

          {/* ── FINANCEIRO (ASAAS) ────────────────── */}
          <TabsContent value="financeiro">
            <AsaasConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
