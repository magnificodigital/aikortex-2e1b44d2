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
import { Switch } from "@/components/ui/switch";
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
  MapPin,
  Star,
  ArrowUp,
  ArrowDown,
  Plug,
  MessageSquare,
  Share2,
  ShoppingBag,
  BarChart3,
  Bot,
  Calendar,
  CreditCard,
  Zap,
  Shield,
  Radio,
  DollarSign,
} from "lucide-react";
import { IntegrationsPanel, ChannelsPanel } from "@/components/settings/IntegrationsPanel";
import AgencyPermissions from "@/components/settings/AgencyPermissions";
import SubscriptionTab from "@/components/settings/SubscriptionTab";
import AsaasConfigTab from "@/components/settings/AsaasConfigTab";

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

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  connected: boolean;
  color: string;
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

const defaultIntegrations: Integration[] = [
  { id: "whatsapp", name: "WhatsApp Business", description: "Atendimento e automação via WhatsApp", icon: <MessageSquare className="w-5 h-5" />, category: "Comunicação", connected: false, color: "#25D366" },
  { id: "instagram", name: "Instagram", description: "Gestão de conteúdo e DMs automatizados", icon: <Instagram className="w-5 h-5" />, category: "Redes Sociais", connected: false, color: "#E4405F" },
  { id: "facebook", name: "Facebook", description: "Páginas, Ads e Messenger", icon: <Facebook className="w-5 h-5" />, category: "Redes Sociais", connected: false, color: "#1877F2" },
  { id: "tiktok", name: "TikTok", description: "Publicação e analytics de vídeos", icon: <Share2 className="w-5 h-5" />, category: "Redes Sociais", connected: false, color: "#000000" },
  { id: "google", name: "Google Workspace", description: "Gmail, Calendar, Drive e Analytics", icon: <Globe className="w-5 h-5" />, category: "Produtividade", connected: false, color: "#4285F4" },
  { id: "slack", name: "Slack", description: "Notificações e comunicação da equipe", icon: <MessageSquare className="w-5 h-5" />, category: "Produtividade", connected: false, color: "#4A154B" },
  { id: "stripe", name: "Stripe", description: "Pagamentos e cobranças recorrentes", icon: <CreditCard className="w-5 h-5" />, category: "Financeiro", connected: false, color: "#635BFF" },
  { id: "shopify", name: "Shopify", description: "E-commerce e gestão de produtos", icon: <ShoppingBag className="w-5 h-5" />, category: "E-commerce", connected: false, color: "#96BF48" },
  { id: "analytics", name: "Google Analytics", description: "Métricas e relatórios de tráfego", icon: <BarChart3 className="w-5 h-5" />, category: "Analytics", connected: false, color: "#E37400" },
  { id: "openai", name: "OpenAI", description: "GPT e modelos de IA generativa", icon: <Bot className="w-5 h-5" />, category: "IA", connected: false, color: "#10A37F" },
  { id: "calendly", name: "Calendly", description: "Agendamento automático de reuniões", icon: <Calendar className="w-5 h-5" />, category: "Produtividade", connected: false, color: "#006BFF" },
  { id: "zapier", name: "Zapier", description: "Automação entre plataformas", icon: <Zap className="w-5 h-5" />, category: "Automação", connected: false, color: "#FF4A00" },
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
const INTEGRATIONS_KEY = "aihub_integrations";

const loadBrand = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const loadIntegrations = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(INTEGRATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
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
  const savedIntegrations = loadIntegrations();

  const [colors, setColors] = useState<BrandColors>(saved?.colors ?? defaultColors);
  const [logoUrl, setLogoUrl] = useState<string | null>(saved?.logoUrl ?? null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(saved?.faviconUrl ?? null);
  const [agencyName, setAgencyName] = useState(saved?.agencyName ?? "Minha Agência");
  const [agencySlogan, setAgencySlogan] = useState(saved?.agencySlogan ?? "Automação & IA para empresas");
  const [bioLinks, setBioLinks] = useState<BioLink[]>(saved?.bioLinks ?? defaultBioLinks);
  const [bioTitle, setBioTitle] = useState(saved?.bioTitle ?? "Minha Agência");
  const [bioDescription, setBioDescription] = useState(saved?.bioDescription ?? "Especialistas em automação e inteligência artificial");
  const [sections, setSections] = useState<LandingSection[]>(saved?.sections ?? defaultSections);
  const [integrations, setIntegrations] = useState<Integration[]>(() =>
    defaultIntegrations.map(i => ({ ...i, connected: savedIntegrations[i.id] ?? false }))
  );
  const [integrationFilter, setIntegrationFilter] = useState("Todas");

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

  // Integration handlers
  const toggleIntegration = (id: string) => {
    setIntegrations(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i);
      const state: Record<string, boolean> = {};
      updated.forEach(i => { state[i.id] = i.connected; });
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(state));
      const item = updated.find(i => i.id === id)!;
      toast({ title: item.connected ? `${item.name} conectado` : `${item.name} desconectado` });
      return updated;
    });
  };

  const categories = ["Todas", ...Array.from(new Set(integrations.map(i => i.category)))];
  const filteredIntegrations = integrationFilter === "Todas" ? integrations : integrations.filter(i => i.category === integrationFilter);

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

        <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "colors"} className="space-y-4">
          <TabsList className="flex h-auto w-full max-w-full gap-1 overflow-x-auto bg-muted/50 p-1 justify-start [scrollbar-width:none]">
            <TabsTrigger value="colors" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Palette className="h-3.5 w-3.5" /> Cores</TabsTrigger>
            <TabsTrigger value="logo" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Image className="h-3.5 w-3.5" /> Logo</TabsTrigger>
            <TabsTrigger value="landing" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Globe className="h-3.5 w-3.5" /> Landing Page</TabsTrigger>
            <TabsTrigger value="biolink" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Link2 className="h-3.5 w-3.5" /> Bio Link</TabsTrigger>
            <TabsTrigger value="integrations" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Plug className="h-3.5 w-3.5" /> Integrações</TabsTrigger>
            <TabsTrigger value="channels" className="shrink-0 gap-1 whitespace-nowrap text-xs"><Radio className="h-3.5 w-3.5" /> Canais</TabsTrigger>
            
            <TabsTrigger value="subscription" className="shrink-0 gap-1 whitespace-nowrap text-xs"><CreditCard className="h-3.5 w-3.5" /> Assinatura & Planos</TabsTrigger>
            <TabsTrigger value="financeiro" className="shrink-0 gap-1 whitespace-nowrap text-xs"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
          </TabsList>

          {/* ── CORES ──────────────────────────────── */}
          <TabsContent value="colors" className="space-y-6">
            <div className="flex justify-end">
              <Button size="sm" onClick={saveBrand}>Salvar Alterações</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Paleta de Cores</h3>
                  <Button variant="ghost" size="sm" onClick={resetColors}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(Object.entries(colors) as [keyof BrandColors, string][]).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs capitalize">{key === "foreground" ? "Texto" : key === "background" ? "Fundo" : key}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={e => updateColor(key, e.target.value)}
                          className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                        />
                        <Input
                          value={value}
                          onChange={e => updateColor(key, e.target.value)}
                          className="font-mono text-xs h-10"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Pré-visualização</h3>
                <div className="rounded-xl overflow-hidden border border-border" style={{ backgroundColor: colors.background }}>
                  <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: colors.primary }}>
                    <div className="w-6 h-6 rounded bg-white/20" />
                    <span className="text-sm font-bold" style={{ color: "#fff" }}>{agencyName}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <h4 className="text-lg font-bold" style={{ color: colors.foreground }}>Bem-vindo à {agencyName}</h4>
                    <p className="text-xs" style={{ color: colors.secondary }}>{agencySlogan}</p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-md text-xs font-medium text-white" style={{ backgroundColor: colors.primary }}>Primário</button>
                      <button className="px-3 py-1.5 rounded-md text-xs font-medium text-white" style={{ backgroundColor: colors.accent }}>Accent</button>
                      <button className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ backgroundColor: colors.secondary, color: "#fff" }}>Secundário</button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge style={{ backgroundColor: colors.success, color: "#fff" }}>Sucesso</Badge>
                      <Badge style={{ backgroundColor: colors.warning, color: "#fff" }}>Aviso</Badge>
                      <Badge style={{ backgroundColor: colors.primary + "20", color: colors.primary }}>Info</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── LOGO ───────────────────────────────── */}
          <TabsContent value="logo" className="space-y-6">
            <div className="flex justify-end">
              <Button size="sm" onClick={saveBrand}>Salvar Alterações</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 space-y-5">
                <h3 className="text-sm font-semibold text-foreground">Identidade Visual</h3>
                <div className="space-y-3">
                  <Label className="text-xs">Nome da Agência</Label>
                  <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs">Slogan</Label>
                  <Input value={agencySlogan} onChange={e => setAgencySlogan(e.target.value)} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs">Logo Principal</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload Logo
                      </Button>
                      {logoUrl && (
                        <Button variant="ghost" size="sm" onClick={() => setLogoUrl(null)} className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                        </Button>
                      )}
                      <p className="text-[10px] text-muted-foreground">PNG, SVG ou JPG. Máx 2MB.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs">Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <Globe className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                      <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload Favicon
                      </Button>
                      <p className="text-[10px] text-muted-foreground">32x32px recomendado.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Pré-visualização</h3>
                <div className="rounded-xl overflow-hidden border border-border bg-card p-6 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-lg">{agencyName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground">{agencyName}</h4>
                    <p className="text-sm text-muted-foreground">{agencySlogan}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {faviconUrl ? <img src={faviconUrl} alt="" className="w-full h-full" /> : <Globe className="w-2.5 h-2.5" />}
                    </div>
                    <span>agencia.com</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── LANDING PAGE ───────────────────────── */}
          <TabsContent value="landing" className="space-y-6">
            <div className="flex justify-end">
              <Button size="sm" onClick={saveBrand}>Salvar Alterações</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Seções da Landing Page</h3>
                  <Button variant="outline" size="sm" onClick={addSection}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Seção
                  </Button>
                </div>
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                  {sections.map((section, idx) => (
                    <div key={section.id} className={`glass-card rounded-xl p-4 space-y-3 transition-opacity ${section.visible ? "" : "opacity-50"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">{section.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(section.id, "up")} disabled={idx === 0}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(section.id, "down")} disabled={idx === sections.length - 1}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateSection(section.id, "visible", !section.visible)}>
                            <Eye className={`w-3 h-3 ${section.visible ? "" : "text-muted-foreground"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSection(section.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Input value={section.title} onChange={e => updateSection(section.id, "title", e.target.value)} placeholder="Título" className="text-sm font-semibold" />
                      <Input value={section.subtitle} onChange={e => updateSection(section.id, "subtitle", e.target.value)} placeholder="Subtítulo" className="text-xs" />
                      <Textarea value={section.content} onChange={e => updateSection(section.id, "content", e.target.value)} placeholder="Conteúdo..." rows={3} className="text-xs" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 space-y-0 max-h-[75vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-foreground mb-3 sticky top-0 bg-card/90 backdrop-blur py-2 z-10">Preview Landing Page</h3>
                <div className="rounded-xl overflow-hidden border border-border">
                  {sections.filter(s => s.visible).map((section) => (
                    <div key={section.id} className="border-b border-border last:border-b-0">
                      {section.type === "hero" ? (
                        <div className="p-8 text-center" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                          {logoUrl && <img src={logoUrl} alt="Logo" className="w-12 h-12 mx-auto mb-4 rounded-lg" />}
                          <p className="text-xs font-medium text-white/80 mb-1">{section.subtitle}</p>
                          <h2 className="text-xl font-bold text-white mb-2">{section.title}</h2>
                          <p className="text-xs text-white/70 max-w-sm mx-auto">{section.content}</p>
                          <button className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-white/20 text-white backdrop-blur border border-white/20">Começar agora</button>
                        </div>
                      ) : section.type === "services" ? (
                        <div className="p-6 bg-card">
                          <h3 className="text-sm font-bold text-foreground text-center mb-1">{section.title}</h3>
                          <p className="text-[10px] text-muted-foreground text-center mb-4">{section.subtitle}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {section.content.split(",").map((s, i) => (
                              <div key={i} className="rounded-lg bg-muted/50 p-3 text-center">
                                <Star className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="text-[10px] font-medium text-foreground">{s.trim()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : section.type === "contact" ? (
                        <div className="p-6 text-center" style={{ backgroundColor: colors.foreground }}>
                          <h3 className="text-sm font-bold text-white mb-1">{section.title}</h3>
                          <p className="text-[10px] text-white/60 mb-3">{section.subtitle}</p>
                          <p className="text-[10px] text-white/80">{section.content}</p>
                        </div>
                      ) : (
                        <div className="p-6 bg-card">
                          <h3 className="text-sm font-bold text-foreground text-center mb-1">{section.title}</h3>
                          <p className="text-[10px] text-muted-foreground text-center mb-2">{section.subtitle}</p>
                          <p className="text-xs text-muted-foreground text-center max-w-md mx-auto">{section.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── BIO LINK ───────────────────────────── */}
          <TabsContent value="biolink" className="space-y-6">
            <div className="flex justify-end">
              <Button size="sm" onClick={saveBrand}>Salvar Alterações</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Configuração do Bio Link</h3>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">aihub.app/bio/</span>
                    <span className="text-xs font-medium text-foreground">{agencyName.toLowerCase().replace(/\s+/g, "-")}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={copyBioUrl}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Título</Label>
                    <Input value={bioTitle} onChange={e => setBioTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Textarea value={bioDescription} onChange={e => setBioDescription(e.target.value)} rows={2} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Links</h3>
                  <Button variant="outline" size="sm" onClick={addBioLink}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Link
                  </Button>
                </div>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {bioLinks.map((link, idx) => (
                    <div key={link.id} className={`glass-card rounded-lg p-3 space-y-2 transition-opacity ${link.active ? "" : "opacity-50"}`}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                        <Input value={link.label} onChange={e => updateBioLink(link.id, "label", e.target.value)} className="h-8 text-xs font-medium flex-1" />
                        <select value={link.icon} onChange={e => updateBioLink(link.id, "icon", e.target.value)} className="h-8 text-xs rounded-md border border-input bg-background px-2">
                          {Object.keys(iconMap).map(k => (<option key={k} value={k}>{k}</option>))}
                        </select>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBioLink(link.id, "up")} disabled={idx === 0}><ArrowUp className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBioLink(link.id, "down")} disabled={idx === bioLinks.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateBioLink(link.id, "active", !link.active)}><Eye className={`w-3 h-3 ${link.active ? "" : "text-muted-foreground"}`} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeBioLink(link.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <Input value={link.url} onChange={e => updateBioLink(link.id, "url", e.target.value)} className="h-8 text-xs font-mono" placeholder="https://..." />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Preview Bio Link</h3>
                <div className="max-w-xs mx-auto">
                  <div className="rounded-2xl overflow-hidden border border-border shadow-lg" style={{ background: `linear-gradient(180deg, ${colors.primary}, ${colors.accent})` }}>
                    <div className="p-6 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full mx-auto border-2 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center">
                        {logoUrl ? (<img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />) : (<span className="text-2xl font-bold text-white">{bioTitle.charAt(0)}</span>)}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">{bioTitle}</h4>
                        <p className="text-[10px] text-white/70">{bioDescription}</p>
                      </div>
                    </div>
                    <div className="px-4 pb-6 space-y-2">
                      {bioLinks.filter(l => l.active).map(link => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white hover:bg-white/20 transition-colors">
                          {iconMap[link.icon] || <Link2 className="w-4 h-4" />}
                          <span className="text-sm font-medium flex-1">{link.label}</span>
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── INTEGRAÇÕES ─────────────────────────── */}
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsPanel />
          </TabsContent>

          {/* ── CANAIS ─────────────────────────── */}
          <TabsContent value="channels" className="space-y-6">
            <ChannelsPanel />
          </TabsContent>


          {/* ── ASSINATURA ─────────────────────────── */}
          <TabsContent value="subscription">
            <SubscriptionTab />
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
